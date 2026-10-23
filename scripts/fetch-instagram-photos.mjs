import { readFile, mkdir, open, rm, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { setTimeout as sleep } from 'node:timers/promises'
import { createInterface } from 'node:readline/promises'
import { buildContent, root as projectRoot } from './build-content.mjs'
import { validateExport } from './content-lib.mjs'
import {
  POLICY, DownloadStop, shortcodeToMediaId, extractPhotos, retryAfterMs,
  requestReadyAt, reserveRequest, collectPostIds, atomicWrite, exists,
  ensureThumbnail, findOriginal, savePhoto, readImageResponse, isInstagramMediaUrl,
} from './instagram-photo-lib.mjs'

const help = `Fungarium Instagram photo downloader

  npm run photos:instagram -- --dry-run
  npm run photos:instagram -- --login
  npm run photos:instagram
  npm run photos:instagram -- --limit 5
  npm run photos:instagram -- --post CxBLMJGsB-n
  npm run photos:instagram -- --thumbs-only
  npm run photos:instagram -- --export "C:/path/to/fungarium-instagram-export.json"

Options:
  --login          Open a separate Chrome profile and save your manual login.
  --dry-run        List the plan without opening Chrome, changing files, or making requests.
  --limit N        Process at most N pending posts (default 10; 1–1000).
  --post ID        Select an ID from the local caption files; repeat for multiple posts.
  --thumbs-only    Generate missing WebP thumbs from local originals; no network or login.
  --export FILE    Use the existing browser export for media URLs; no post API requests.
  --help          Show this help.

All requests are serial. Post lookups are 30–60 seconds apart, with a five-minute
break every five lookups and at most 20 lookups per rolling hour. Image requests
are 2–4 seconds apart. A 15-minute lookup cooldown applies after each run.
Completed posts are skipped; existing originals and thumbnails are reused.
429/authentication/challenge responses stop the run and persist a cooldown of
at least 24 hours (longer when Retry-After requests it). There are no automatic
retries, proxy rotation, or attempts to bypass challenges. No pace guarantees
that Instagram will not restrict a session.
`

export function optionsFromArgs(args) {
  const { values } = parseArgs({ args, options: {
    login: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    'thumbs-only': { type: 'boolean', default: false },
    limit: { type: 'string', default: '10' },
    post: { type: 'string', multiple: true, default: [] },
    export: { type: 'string' },
    help: { type: 'boolean', default: false },
  } })
  const limit = Number(values.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('--limit must be an integer from 1 to 1000.')
  if (values.login && (values.export || values['thumbs-only'] || values.post.length)) throw new Error('Run --login on its own.')
  if (values.export && values['thumbs-only']) throw new Error('--export and --thumbs-only are separate operations.')
  return { ...values, limit }
}

async function loadState(stateFile) {
  try {
    const state = JSON.parse(await readFile(stateFile, 'utf8'))
    if (state.version !== 1 || !state.posts || typeof state.posts !== 'object') throw new Error('Unsupported download-state format. Keep the file and investigate before continuing.')
    return state
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, metadataRequests: [], posts: {} }
    throw error
  }
}

async function acquireLock(lockFile) {
  try {
    const handle = await open(lockFile, 'wx', 0o600)
    await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }))
    await handle.close()
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    const lock = JSON.parse(await readFile(lockFile, 'utf8'))
    if (!Number.isInteger(lock.pid) || lock.pid < 1) throw new Error('Invalid download lock. Check that no other downloader is running.')
    try { process.kill(lock.pid, 0) }
    catch (processError) {
      if (processError.code === 'ESRCH') { await rm(lockFile); return acquireLock(lockFile) }
      throw processError
    }
    throw new Error(`A downloader or login window is already running (PID ${lock.pid}). Close it before starting another.`)
  }
  return () => rm(lockFile, { force: true })
}

async function openBrowser(browserDirectory) {
  const { chromium } = await import('@playwright/test')
  return chromium.launchPersistentContext(browserDirectory, { channel: 'chrome', headless: false, viewport: { width: 1100, height: 800 } })
}

async function login(context, signal) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const page = context.pages()[0] || await context.newPage()
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' })
    console.info('Log in manually in this separate Chrome window. Complete any normal Instagram verification yourself.')
    await terminal.question('Keep the window open, then press Enter here once you are logged in: ', { signal })
    if (!(await context.cookies('https://www.instagram.com/')).some(cookie => cookie.name === 'sessionid')) throw new Error('No Instagram session was found. Run --login again after completing login.')
    console.info('Login saved in content/instagram-browser/. No cookies were printed or added to the site.')
  } finally { terminal.close() }
}

async function isFinished(root, post, shortcode) {
  if (post?.status === 'unavailable' || post?.status === 'no-photos') return true
  if (post?.status !== 'complete' || !post.photos?.length) return false
  for (const photo of post.photos) {
    if (!await exists(path.join(root, 'public/images/posts', shortcode, photo.file)) ||
        !await exists(path.join(root, 'public/thumbs/posts', shortcode, photo.thumbnail))) return false
  }
  return true
}

async function localThumbnails(root, jobs, signal, dryRun = false) {
  let originals = 0
  let created = 0
  for (const { shortcode } of jobs) {
    signal?.throwIfAborted()
    const directory = path.join(root, 'public/images/posts', shortcode)
    const thumbs = path.join(root, 'public/thumbs/posts', shortcode)
    let files
    try { files = await readdir(directory) } catch (error) { if (error.code === 'ENOENT') continue; throw error }
    for (const file of files.filter(file => /\.(?:jpe?g|png|webp|avif)$/iu.test(file))) {
      originals++
      const thumbnail = path.join(thumbs, `${path.parse(file).name}.webp`)
      if (await exists(thumbnail)) continue
      if (!dryRun) {
        await mkdir(thumbs, { recursive: true })
        await ensureThumbnail(path.join(directory, file), thumbnail)
      }
      created++
    }
  }
  console.info(`${originals} local originals; ${created} ${dryRun ? 'missing thumbnails would be generated' : 'WebP thumbnails generated'}.`)
  return created
}

// Injectable I/O lets the restriction and resume tests run without contacting Instagram.
export async function run(options, services = {}) {
  const root = services.root || projectRoot
  const stateFile = path.join(root, 'content/photo-download-state.json')
  const lockFile = path.join(root, 'content/photo-download.lock')
  const browserDirectory = path.join(root, 'content/instagram-browser')
  const launchBrowser = services.openBrowser || (() => openBrowser(browserDirectory))
  const fetchImage = services.fetch || fetch
  const refreshContent = services.buildContent || buildContent
  const delay = services.sleep || sleep
  const { jobs: allJobs, placeholders } = await collectPostIds(root)
  const selected = new Set(options.post)
  for (const id of selected) if (!allJobs.some(job => job.shortcode === id)) throw new Error(`Post ${id} is not a valid fungi post ID in the local caption filenames.`)
  const jobs = selected.size ? allJobs.filter(job => selected.has(job.shortcode)) : allJobs
  console.info(`Found ${allJobs.length} unique fungi post IDs; ${placeholders} placeholder ID(s) skipped.`)
  if (options.help) { console.info(help); return }
  const state = await loadState(stateFile)
  const pending = []
  for (const job of jobs) if (!await isFinished(root, state.posts[job.shortcode], job.shortcode)) pending.push(job)

  if (options['dry-run']) {
    if (options['thumbs-only']) { await localThumbnails(root, jobs, null, true); return }
    console.info(`${pending.length} pending posts; next batch: ${Math.min(options.limit, pending.length)}.`)
    for (const job of pending.slice(0, options.limit)) console.info(`  ${job.shortcode}  ${job.date}  ${job.filename}`)
    if (state.cooldownUntil > Date.now()) console.info(`Network downloads paused until ${new Date(state.cooldownUntil).toISOString()}: ${state.stopReason}`)
    console.info('Dry run: no requests made and no files changed.')
    return
  }

  await mkdir(path.join(root, 'content'), { recursive: true })
  const releaseLock = await acquireLock(lockFile)
  const controller = new AbortController()
  let context
  let changed = false
  let metadataCount = 0
  let finished = 0
  const interrupt = () => {
    console.info('\nStopping. Completed photos and pacing checkpoints will be kept.')
    controller.abort()
    void context?.close().catch(() => {})
  }
  process.once('SIGINT', interrupt)
  const saveState = () => atomicWrite(stateFile, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })

  async function beforeRequest(kind) {
    controller.signal.throwIfAborted()
    if ((state.cooldownUntil || 0) > Date.now()) throw new Error(`Downloads paused until ${new Date(state.cooldownUntil).toISOString()}: ${state.stopReason}`)
    const wait = requestReadyAt(state, kind) - Date.now()
    if (wait > 0) {
      console.info(`  Waiting ${Math.ceil(wait / 1000)}s before the next ${kind === 'metadata' ? 'post lookup' : 'photo request'}…`)
      await delay(wait, undefined, { signal: controller.signal })
    }
    reserveRequest(state, kind)
    if (kind === 'metadata') metadataCount++
    // Persist pacing before requests so restarting after a crash cannot speed them up.
    await saveState()
  }

  async function lookup(shortcode) {
    await beforeRequest('metadata')
    const cookies = await context.cookies('https://www.instagram.com/')
    if (!cookies.some(cookie => cookie.name === 'sessionid')) throw new DownloadStop('Instagram login has expired. Use --login after the cooldown.', { cooldownMs: POLICY.blockedMs })
    const headers = { 'X-IG-App-ID': '936619743392459', 'X-Requested-With': 'XMLHttpRequest', Referer: `https://www.instagram.com/p/${shortcode}/` }
    const csrf = cookies.find(cookie => cookie.name === 'csrftoken')?.value
    if (csrf) headers['X-CSRFToken'] = csrf
    const response = await context.request.get(`https://www.instagram.com/api/v1/media/${shortcodeToMediaId(shortcode)}/info/`, {
      headers, timeout: 45_000, maxRetries: 0, maxRedirects: 0,
    })
    try {
      const status = response.status()
      const retry = retryAfterMs(response.headers()['retry-after'])
      if (status === 404) return null
      if (status === 429 || status === 401 || status === 403 || (status >= 300 && status < 400)) {
        throw new DownloadStop(`Instagram returned HTTP ${status}; stopping rather than retrying.`, { cooldownMs: Math.max(POLICY.blockedMs, retry) })
      }
      if (!response.ok()) throw new DownloadStop(`Instagram returned HTTP ${status}; stopping this batch.`, { cooldownMs: Math.max(POLICY.errorMs, retry) })
      if (!response.headers()['content-type']?.includes('json')) throw new DownloadStop('Instagram returned a login/challenge page or unexpected format.', { cooldownMs: POLICY.blockedMs })
      const data = await response.json()
      if (data.status === 'fail' || data.require_login || data.challenge || data.checkpoint_url || data.feedback_required || data.spam || data.error_type || /login_required|challenge_required|checkpoint_required|feedback_required|please wait|too many requests/iu.test(data.message || '')) {
        throw new DownloadStop('Instagram reported a restriction, login requirement, or challenge. Inspect it manually; this script will not retry.', { cooldownMs: Math.max(POLICY.blockedMs, retry) })
      }
      const item = data.items?.[0]
      if (!item) throw new DownloadStop('Instagram did not return the expected media data. Its web endpoint may have changed.')
      return extractPhotos(item, shortcode)
    } finally { await response.dispose() }
  }

  async function download(url) {
    if (!isInstagramMediaUrl(url)) throw new DownloadStop('Refusing a photo URL outside Instagram’s HTTPS media servers.')
    await beforeRequest('media')
    const response = await fetchImage(url, { redirect: 'error', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]) })
    if (!response.ok) {
      await response.body?.cancel()
      const status = response.status
      const retry = retryAfterMs(response.headers.get('retry-after'))
      if (status === 429) throw new DownloadStop('Photo server returned HTTP 429; stopping all requests.', { cooldownMs: Math.max(POLICY.blockedMs, retry) })
      if (status === 401 || status === 403 || status === 404) throw new DownloadStop(`Photo server returned HTTP ${status}. The signed URL may have expired; a later run will refresh the post metadata.`, { staleMedia: true, cooldownMs: Math.max(POLICY.errorMs, retry) })
      throw new DownloadStop(`Photo server returned HTTP ${status}; no immediate retry will be made.`, { cooldownMs: Math.max(POLICY.errorMs, retry) })
    }
    return readImageResponse(response)
  }

  let activePost
  try {
    if (options.login) { context = await launchBrowser(); await login(context, controller.signal); return }
    if (options['thumbs-only']) { changed = (await localThumbnails(root, jobs, controller.signal)) > 0; return }
    if ((state.cooldownUntil || 0) > Date.now()) throw new Error(`Downloads paused until ${new Date(state.cooldownUntil).toISOString()}: ${state.stopReason}`)
    if (!pending.length) { console.info('All selected posts are complete. Nothing to download.'); return }

    let exported = null
    if (options.export) {
      const data = validateExport(JSON.parse(await readFile(path.resolve(options.export), 'utf8')))
      exported = new Map(data.posts.map(post => [post.shortcode, post.photos]))
    } else {
      context = await launchBrowser()
      if (!(await context.cookies('https://www.instagram.com/')).some(cookie => cookie.name === 'sessionid')) throw new Error('No saved login. First run: npm run photos:instagram -- --login')
    }

    for (const job of pending.slice(0, options.limit)) {
      controller.signal.throwIfAborted()
      activePost = job.shortcode
      const post = state.posts[activePost] ||= { status: 'pending', photos: [] }
      post.status = 'pending'
      const directory = path.join(root, 'public/images/posts', activePost)
      const thumbs = path.join(root, 'public/thumbs/posts', activePost)
      await mkdir(directory, { recursive: true })
      await mkdir(thumbs, { recursive: true })
      console.info(`[${finished + 1}/${Math.min(options.limit, pending.length)}] ${activePost} (${job.date})`)

      let photos
      if (exported) {
        const media = exported.get(activePost)
        if (!media) { console.info('  Not in this export; left pending.'); continue }
        photos = media.map((photo, index) => ({ ...photo, number: index + 1 }))
      } else if (post.metadata && Date.now() - post.fetchedAt < POLICY.metadataCacheMs) {
        photos = post.metadata
      } else {
        photos = await lookup(activePost)
        post.metadata = photos
        post.fetchedAt = Date.now()
        await saveState()
      }
      if (photos === null || !photos.length) {
        post.status = photos === null ? 'unavailable' : 'no-photos'
        console.info(photos === null ? '  Post unavailable (404); skipped.' : '  No photographs (video-only post); skipped.')
        await saveState(); finished++; continue
      }

      for (const photo of photos) {
        controller.signal.throwIfAborted()
        const basename = String(photo.number).padStart(2, '0')
        const original = await findOriginal(directory, basename)
        let saved
        if (original) {
          const thumbnail = `${basename}.webp`
          if (await ensureThumbnail(original, path.join(thumbs, thumbnail))) changed = true
          saved = { file: path.basename(original), thumbnail, number: photo.number }
          console.info(`  ${basename}: existing original reused.`)
        } else {
          const buffer = await download(photo.url)
          saved = await savePhoto(buffer, directory, thumbs, photo.number)
          changed = true
          console.info(`  ${saved.file} + ${saved.thumbnail}`)
        }
        post.photos = [...post.photos.filter(item => item.number !== photo.number), saved].sort((a, b) => a.number - b.number)
        await saveState()
      }
      post.status = 'complete'
      post.completedAt = new Date().toISOString()
      delete post.lastError
      await saveState()
      finished++
    }
    console.info(`Batch finished: ${finished} post(s). Run the same command later to continue with pending posts.`)
  } catch (error) {
    if (controller.signal.aborted) {
      console.info('Stopped by user. Run the same command to resume.')
      process.exitCode = 130
    } else {
      if (activePost) {
        const post = state.posts[activePost]
        post.lastError = error.message
        if (error.staleMedia) { delete post.metadata; delete post.fetchedAt }
        state.cooldownUntil = Math.max(state.cooldownUntil || 0, Date.now() + (error.cooldownMs || POLICY.errorMs))
        state.stopReason = error.message
        await saveState()
        console.error(`Stopped. Next network attempt is allowed after ${new Date(state.cooldownUntil).toISOString()}.`)
      }
      throw error
    }
  } finally {
    process.removeListener('SIGINT', interrupt)
    try {
      if (metadataCount > 0) {
        state.nextMetadataAt = Math.max(state.nextMetadataAt || 0, Date.now() + POLICY.betweenRunsMs)
        await saveState()
      }
      await context?.close().catch(() => {})
      if (changed) {
        console.info('Refreshing the Vue site content with the saved images and thumbnails…')
        await refreshContent()
      }
    } finally { await releaseLock() }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = optionsFromArgs(process.argv.slice(2))
    if (options.help) console.info(help)
    else await run(options)
  } catch (error) {
    console.error(`Photo downloader: ${error.message}`)
    process.exitCode = 1
  }
}
