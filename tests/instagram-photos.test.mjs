import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import {
  POLICY, shortcodeToMediaId, isInstagramMediaUrl, extractPhotos, retryAfterMs,
  requestReadyAt, reserveRequest, collectPostIds, savePhoto, ensureThumbnail, readImageResponse,
} from '../scripts/instagram-photo-lib.mjs'
import { optionsFromArgs, run } from '../scripts/fetch-instagram-photos.mjs'

test('shortcodes decode with BigInt precision, including hyphens and underscores', () => {
  assert.equal(shortcodeToMediaId('BA'), '64')
  assert.equal(shortcodeToMediaId('-_'), String(62 * 64 + 63))
  assert.equal(shortcodeToMediaId('___________'), (64n ** 11n - 1n).toString())
  assert.throws(() => shortcodeToMediaId('../bad'), /Invalid/)
})

test('Instagram URL validation rejects redirects to unrelated hosts and credential-bearing URLs', () => {
  assert.equal(isInstagramMediaUrl('https://scontent.cdninstagram.com/a.jpg?signature=x'), true)
  assert.equal(isInstagramMediaUrl('https://scontent.fhel1-1.fna.fbcdn.net/a.jpg'), true)
  for (const url of ['http://scontent.cdninstagram.com/a', 'https://cdninstagram.com.example.org/a', 'https://user@cdninstagram.com/a', 'https://cdninstagram.com:444/a', 'https://127.0.0.1/a']) assert.equal(isInstagramMediaUrl(url), false)
})

test('carousel extraction chooses the largest real photograph and keeps slide order while skipping videos', () => {
  const photos = extractPhotos({ code: 'post123', carousel_media: [
    { media_type: 1, image_versions2: { candidates: [
      { width: 200, height: 200, url: 'https://s.cdninstagram.com/small.jpg' },
      { width: 1200, height: 800, url: 'https://s.cdninstagram.com/large.jpg' },
    ] } },
    { media_type: 2, image_versions2: { candidates: [{ url: 'https://s.cdninstagram.com/video.jpg' }] } },
    { media_type: 1, image_versions2: { candidates: [{ width: 900, height: 900, url: 'https://s.cdninstagram.com/third.jpg' }] } },
  ] }, 'post123')
  assert.equal(photos.length, 2)
  assert.match(photos[0].url, /large.jpg/)
  assert.equal(photos[1].number, 3)
  assert.throws(() => extractPhotos({ code: 'another' }, 'post123'), /different post/)
})

test('request reservations persist spacing and the configured periodic break', () => {
  const state = { posts: {}, metadataRequests: [] }
  const now = 10_000_000
  reserveRequest(state, 'metadata', now, () => 0)
  assert.equal(requestReadyAt(state, 'metadata', now), now + POLICY.metadataMinMs)
  assert.equal(requestReadyAt(state, 'media', now), now + POLICY.mediaMinMs)
  state.metadataRequestCount = POLICY.breakEvery - 1
  reserveRequest(state, 'metadata', now + 60_000, () => 0)
  assert.equal(state.nextMetadataAt, now + 60_000 + POLICY.breakMs)
  const resumed = JSON.parse(JSON.stringify(state))
  assert.equal(requestReadyAt(resumed, 'metadata', now + 60_000), state.nextMetadataAt)
})

test('rolling hourly cap and persisted cooldown survive restart and apply to all requests', () => {
  const now = 20_000_000
  const state = { metadataRequests: Array.from({ length: POLICY.hourlyMetadataLimit }, (_, i) => now - 30 * 60_000 + i * (30 * 60_000 / POLICY.hourlyMetadataLimit)) }
  assert.equal(requestReadyAt(state, 'metadata', now), now + 30 * 60_000)
  state.cooldownUntil = now + POLICY.blockedMs
  const resumed = JSON.parse(JSON.stringify(state))
  assert.equal(requestReadyAt(resumed, 'metadata', now), state.cooldownUntil)
  assert.equal(requestReadyAt(resumed, 'media', now), state.cooldownUntil)
})

test('Retry-After supports both seconds and HTTP dates', () => {
  assert.equal(retryAfterMs('3600'), 3_600_000)
  assert.equal(retryAfterMs('Wed, 01 Jan 2031 01:00:00 GMT', Date.parse('2031-01-01T00:00:00Z')), 3_600_000)
  assert.equal(retryAfterMs('invalid'), 0)
  assert.equal(retryAfterMs(null), 0)
})

test('queue reads full filename suffixes, excludes plants and placeholder IDs, and deduplicates posts', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'opencode', 'fungarium-queue-'))
  try {
    const fungi = '🆔 Example fungus Author\n🍄 Exampleaceae / Exampleclass'
    await writeFile(path.join(temporary, 'example-fungus_2025-01-01_DZ6T1NzCD__.txt'), fungi)
    await writeFile(path.join(temporary, 'same-post_2025-01-01_DZ6T1NzCD__.txt'), fungi)
    await writeFile(path.join(temporary, 'draft_2026-01-01_xxxxxxxxxxx.txt'), fungi)
    await writeFile(path.join(temporary, 'plant_2026-01-01_plant123.txt'), '🆔 Example plant\n🌸 Examplefamily / Exampleclass')
    const queue = await collectPostIds(temporary)
    assert.equal(queue.jobs.length, 1)
    assert.equal(queue.jobs[0].shortcode, 'DZ6T1NzCD__')
    assert.equal(queue.placeholders, 1)
  } finally { await rm(temporary, { recursive: true, force: true }) }
})

test('photo storage preserves original bytes and generates correctly sized WebP thumbs, resumable offline', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'opencode', 'fungarium-images-'))
  try {
    const originals = path.join(temporary, 'images')
    const thumbs = path.join(temporary, 'thumbs')
    const buffer = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#617455' } }).jpeg().toBuffer()
    const saved = await savePhoto(buffer, originals, thumbs, 1)
    assert.equal(saved.file, '01.jpg')
    assert.deepEqual(await readFile(path.join(originals, saved.file)), buffer)
    const metadata = await sharp(await readFile(path.join(thumbs, saved.thumbnail))).metadata()
    assert.equal(metadata.format, 'webp')
    assert.equal(metadata.width, 600)
    assert.equal(metadata.height, 375)
    assert.equal(await ensureThumbnail(path.join(originals, saved.file), path.join(thumbs, saved.thumbnail)), false)
    await rm(path.join(thumbs, saved.thumbnail))
    assert.equal(await ensureThumbnail(path.join(originals, saved.file), path.join(thumbs, saved.thumbnail)), true)
    const small = await sharp({ create: { width: 80, height: 120, channels: 3, background: 'white' } }).png().toBuffer()
    await savePhoto(small, originals, thumbs, 2)
    const smallThumb = await sharp(await readFile(path.join(thumbs, '02.webp'))).metadata()
    assert.equal(smallThumb.width, 80)
    assert.equal(smallThumb.height, 120)
    await assert.rejects(savePhoto(Buffer.from('not an image'), originals, thumbs, 3))
  } finally { await rm(temporary, { recursive: true, force: true }) }
})

test('image responses reject login HTML and oversized bodies without accepting a photo', async () => {
  await assert.rejects(readImageResponse(new Response('<html>Login</html>', { headers: { 'content-type': 'text/html' } })), /did not return an image/)
  await assert.rejects(readImageResponse(new Response('large', { headers: { 'content-type': 'image/jpeg', 'content-length': String(POLICY.maxImageBytes + 1) } })), /30 MB/)
})

test('CLI defaults to a small resumable batch and rejects conflicting modes', () => {
  assert.equal(optionsFromArgs([]).limit, 10)
  assert.deepEqual(optionsFromArgs(['--post', 'post123', '--post', 'post456']).post, ['post123', 'post456'])
  assert.throws(() => optionsFromArgs(['--limit', '0']), /--limit/)
  assert.throws(() => optionsFromArgs(['--login', '--export', 'export.json']), /on its own/)
  assert.throws(() => optionsFromArgs(['--thumbs-only', '--export', 'export.json']), /separate operations/)
})

async function downloadFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'opencode', 'fungarium-download-'))
  await writeFile(path.join(root, 'example_2026-01-01_post123.txt'), '🆔 Example fungus Author\n🍄 Exampleaceae / Exampleclass')
  return root
}

function fakeContext(response, onRequest = () => {}) {
  return {
    cookies: async () => [{ name: 'sessionid', value: 'test-only' }],
    close: async () => {},
    request: { get: async (...args) => { onRequest(...args); return response } },
  }
}

test('429, authentication failures, and successful-HTTP challenges stop with no retry and a persisted cooldown', async () => {
  for (const scenario of [
    { status: 429, data: {}, retryAfter: String(48 * 60 * 60), hours: 48 },
    { status: 403, data: {}, hours: 24 },
    { status: 200, data: { status: 'fail', message: 'challenge_required' }, hours: 24 },
  ]) {
    const root = await downloadFixture()
    let requests = 0
    let browsers = 0
    const response = {
      status: () => scenario.status, ok: () => scenario.status === 200,
      headers: () => ({ 'content-type': 'application/json', 'retry-after': scenario.retryAfter }),
      json: async () => scenario.data, dispose: async () => {},
    }
    const services = {
      root, openBrowser: async () => { browsers++; return fakeContext(response, () => { requests++ }) },
      fetch: async () => { throw new Error('Image request must not happen') },
      buildContent: async () => {},
    }
    try {
      const started = Date.now()
      await assert.rejects(run(optionsFromArgs([]), services))
      assert.equal(requests, 1)
      const checkpoint = JSON.parse(await readFile(path.join(root, 'content/photo-download-state.json'), 'utf8'))
      assert.ok(checkpoint.cooldownUntil >= started + scenario.hours * 60 * 60_000)
      assert.equal(checkpoint.posts.post123.status, 'pending')
      await assert.rejects(run(optionsFromArgs([]), services), /paused until/)
      assert.equal(requests, 1)
      assert.equal(browsers, 1)
    } finally { await rm(root, { recursive: true, force: true }) }
  }
})

test('successful download creates site files, skips a completed post, and repairs a missing thumbnail without another request', async () => {
  const root = await downloadFixture()
  const buffer = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#617455' } }).jpeg().toBuffer()
  let metadataRequests = 0
  let imageRequests = 0
  let refreshes = 0
  const response = {
    status: () => 200, ok: () => true, headers: () => ({ 'content-type': 'application/json' }),
    json: async () => ({ status: 'ok', items: [{ code: 'post123', media_type: 1, image_versions2: { candidates: [{ width: 900, height: 600, url: 'https://s.cdninstagram.com/photo.jpg' }] } }] }),
    dispose: async () => {},
  }
  const services = {
    root, openBrowser: async () => fakeContext(response, () => { metadataRequests++ }),
    fetch: async () => { imageRequests++; return new Response(buffer, { headers: { 'content-type': 'image/jpeg' } }) },
    sleep: async () => {}, buildContent: async () => { refreshes++ },
  }
  try {
    await run(optionsFromArgs([]), services)
    assert.equal(metadataRequests, 1)
    assert.equal(imageRequests, 1)
    assert.deepEqual(await readFile(path.join(root, 'public/images/posts/post123/01.jpg')), buffer)
    const thumb = path.join(root, 'public/thumbs/posts/post123/01.webp')
    assert.equal((await sharp(await readFile(thumb)).metadata()).width, 600)
    await run(optionsFromArgs([]), services)
    assert.equal(metadataRequests, 1)
    assert.equal(imageRequests, 1)
    await rm(thumb)
    await run(optionsFromArgs([]), services)
    assert.equal(metadataRequests, 1)
    assert.equal(imageRequests, 1)
    assert.ok((await readFile(thumb)).length)
    assert.equal(refreshes, 2)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('offline thumbnails are available even during a saved network cooldown', async () => {
  const root = await downloadFixture()
  try {
    await mkdir(path.join(root, 'public/images/posts/post123'), { recursive: true })
    await mkdir(path.join(root, 'content'))
    await writeFile(path.join(root, 'content/photo-download-state.json'), JSON.stringify({ version: 1, posts: {}, cooldownUntil: Date.now() + POLICY.blockedMs }))
    await sharp({ create: { width: 100, height: 80, channels: 3, background: 'white' } }).jpeg().toFile(path.join(root, 'public/images/posts/post123/custom.jpg'))
    await run(optionsFromArgs(['--thumbs-only']), {
      root, openBrowser: async () => { throw new Error('Must remain offline') },
      fetch: async () => { throw new Error('Must remain offline') }, buildContent: async () => {},
    })
    assert.ok((await readFile(path.join(root, 'public/thumbs/posts/post123/custom.webp'))).length)
  } finally { await rm(root, { recursive: true, force: true }) }
})
