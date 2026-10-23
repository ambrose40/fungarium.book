import { readdir, readFile, mkdir, writeFile, rename, rm, access } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { isFungiCaption } from './content-lib.mjs'

export const POLICY = Object.freeze({
  metadataMinMs: 15_000,
  metadataMaxMs: 30_000,
  mediaMinMs: 2_000,
  mediaMaxMs: 4_000,
  breakEvery: 50,
  breakMs: 1 * 60_000,
  hourlyMetadataLimit: 400,
  betweenRunsMs: 1 * 60_000,
  blockedMs: 24 * 60 * 60_000,
  errorMs: 1 * 60_000,
  metadataCacheMs: 60 * 60_000,
  maxImageBytes: 30 * 1024 * 1024,
  thumbnailSize: 600,
  thumbnailQuality: 80,
})

export class DownloadStop extends Error {
  constructor(message, { cooldownMs = POLICY.errorMs, staleMedia = false } = {}) {
    super(message)
    this.name = 'DownloadStop'
    this.cooldownMs = cooldownMs
    this.staleMedia = staleMedia
  }
}

export function shortcodeToMediaId(shortcode) {
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(shortcode)) throw new Error('Invalid Instagram shortcode.')
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  return [...shortcode].reduce((value, char) => value * 64n + BigInt(alphabet.indexOf(char)), 0n).toString()
}

export function isInstagramMediaUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && /(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(url.hostname)
  } catch { return false }
}

export function extractPhotos(item, shortcode) {
  if (item.code && item.code !== shortcode) throw new DownloadStop('Instagram returned a different post. Stopping without saving its photos.')
  const media = item.carousel_media?.length ? item.carousel_media : [item]
  return media.flatMap((image, index) => {
    // Videos are not photographs; do not silently download a video poster as one.
    if (image.media_type === 2 || image.video_versions?.length) return []
    const candidates = [...(image.image_versions2?.candidates || [])]
      .filter(candidate => isInstagramMediaUrl(candidate.url))
      .sort((a, b) => b.width * b.height - a.width * a.height)
    if (!candidates.length) throw new DownloadStop(`No supported photo URL was returned for ${shortcode}, slide ${index + 1}.`)
    return [{ ...candidates[0], number: index + 1 }]
  })
}

export function retryAfterMs(header, now = Date.now()) {
  if (!header) return 0
  if (/^\d+(?:\.\d+)?$/.test(header.trim())) {
    const milliseconds = Number(header) * 1000
    return Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : 0
  }
  const date = Date.parse(header)
  return Number.isFinite(date) ? Math.max(0, date - now) : 0
}

export function requestReadyAt(state, kind, now = Date.now()) {
  let ready = Math.max(now, state.nextRequestAt || 0, state.cooldownUntil || 0)
  if (kind === 'metadata') {
    ready = Math.max(ready, state.nextMetadataAt || 0)
    const recent = (state.metadataRequests || []).filter(time => time > now - 60 * 60_000).sort((a, b) => a - b)
    if (recent.length >= POLICY.hourlyMetadataLimit) ready = Math.max(ready, recent[recent.length - POLICY.hourlyMetadataLimit] + 60 * 60_000)
  }
  return ready
}

export function reserveRequest(state, kind, now = Date.now(), random = Math.random) {
  const jitter = (min, max) => min + Math.floor(random() * (max - min + 1))
  state.nextRequestAt = now + jitter(POLICY.mediaMinMs, POLICY.mediaMaxMs)
  if (kind === 'metadata') {
    state.metadataRequests = [...(state.metadataRequests || []).filter(time => time > now - 60 * 60_000), now]
    state.metadataRequestCount = (state.metadataRequestCount || 0) + 1
    state.nextMetadataAt = now + jitter(POLICY.metadataMinMs, POLICY.metadataMaxMs)
    if (state.metadataRequestCount % POLICY.breakEvery === 0) state.nextMetadataAt = Math.max(state.nextMetadataAt, now + POLICY.breakMs)
  }
}

export async function collectPostIds(root) {
  const jobs = new Map()
  let placeholders = 0
  for (const filename of (await readdir(root)).sort()) {
    const match = filename.match(/^(.+)_(\d{4}-\d{2}-\d{2})_([A-Za-z0-9_-]+)\.txt$/u)
    if (!match) continue
    if (!isFungiCaption(await readFile(path.join(root, filename), 'utf8'))) continue
    if (/^x+$/i.test(match[3])) { placeholders++; continue }
    if (!/^[A-Za-z0-9_-]{5,30}$/.test(match[3])) throw new Error(`Invalid post ID in ${filename}`)
    jobs.set(match[3], { shortcode: match[3], date: match[2], filename })
  }
  return { jobs: [...jobs.values()].sort((a, b) => b.date.localeCompare(a.date) || a.shortcode.localeCompare(b.shortcode)), placeholders }
}

export async function atomicWrite(filename, bytes, options = {}) {
  const temporary = `${filename}.part`
  try {
    await writeFile(temporary, bytes, options)
    await rename(temporary, filename)
  } finally { await rm(temporary, { force: true }) }
}

export async function exists(filename) {
  try { await access(filename); return true }
  catch (error) { if (error.code === 'ENOENT') return false; throw error }
}

export async function ensureThumbnail(image, thumbnail) {
  if (await exists(thumbnail)) return false
  const output = await sharp(await readFile(image), { limitInputPixels: 100_000_000 }).rotate()
    .resize(POLICY.thumbnailSize, POLICY.thumbnailSize, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: POLICY.thumbnailQuality, effort: 4 }).toBuffer()
  await atomicWrite(thumbnail, output)
  return true
}

export async function findOriginal(directory, basename) {
  for (const extension of ['jpg', 'jpeg', 'png', 'webp', 'avif']) {
    const filename = path.join(directory, `${basename}.${extension}`)
    if (await exists(filename)) return filename
  }
  return null
}

export async function savePhoto(buffer, directory, thumbDirectory, number) {
  if (!buffer.length || buffer.length > POLICY.maxImageBytes) throw new Error('Photo is empty or exceeds the 30 MB limit.')
  const metadata = await sharp(buffer, { limitInputPixels: 100_000_000 }).metadata()
  const extension = { jpeg: 'jpg', png: 'png', webp: 'webp', avif: 'avif', heif: 'avif' }[metadata.format]
  if (!extension) throw new Error(`Unsupported photo format: ${metadata.format}`)
  if (metadata.format === 'heif' && metadata.compression !== 'av1') throw new Error('HEIC photos are not supported by this website.')
  const basename = String(number).padStart(2, '0')
  const original = path.join(directory, `${basename}.${extension}`)
  const thumbnail = path.join(thumbDirectory, `${basename}.webp`)
  // Decode the full image before saving either file; a truncated download is not a completed photo.
  const thumb = await sharp(buffer, { limitInputPixels: 100_000_000 }).rotate()
    .resize(POLICY.thumbnailSize, POLICY.thumbnailSize, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: POLICY.thumbnailQuality, effort: 4 }).toBuffer()
  await mkdir(directory, { recursive: true })
  await mkdir(thumbDirectory, { recursive: true })
  await atomicWrite(original, buffer)
  await atomicWrite(thumbnail, thumb)
  return { file: path.basename(original), thumbnail: path.basename(thumbnail), number, width: metadata.width, height: metadata.height }
}

export async function readImageResponse(response) {
  if (!response.headers.get('content-type')?.startsWith('image/')) {
    await response.body?.cancel()
    throw new DownloadStop('The photo server did not return an image.')
  }
  if (Number(response.headers.get('content-length')) > POLICY.maxImageBytes) {
    await response.body?.cancel()
    throw new DownloadStop('Photo exceeds the 30 MB limit.')
  }
  const chunks = []
  let size = 0
  for await (const chunk of response.body || []) {
    size += chunk.length
    if (size > POLICY.maxImageBytes) throw new DownloadStop('Photo exceeds the 30 MB limit.')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
