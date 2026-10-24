import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { coverPreviewPath, topNineWebpPath } from '../src/lib/image-delivery.mjs'
import { prepareCoverPreviews } from '../scripts/prepare-previews.mjs'
import { prepareFonts } from '../scripts/prepare-fonts.mjs'

test('cover derivatives only transform local post images; originals and other URLs stay intact', () => {
  assert.equal(coverPreviewPath({ src: '/images/posts/abc-123/photo.JPG' }), '/thumbs/posts/abc-123/photo.cover-v1.webp')
  for (const src of ['https://example.org/image.jpg', '/other/photo.jpg', '/images/posts/id/nested/photo.jpg', '/images/posts/id/photo.svg']) assert.equal(coverPreviewPath({ src }), src)
  assert.equal(coverPreviewPath(null), '')
  assert.equal(topNineWebpPath('/images/fungarium-2024.jpeg'), '/images/fungarium-2024.webp')
})

test('preview generation deduplicates covers, bounds size, retains originals and skips unchanged files', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'fungarium-preview-'))
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }))
  const directory = path.join(root, 'public/images/posts/id')
  await mkdir(directory, { recursive: true })
  const source = path.join(directory, 'cover.jpg')
  await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#906030' } }).jpeg().toFile(source)
  const bytes = await readFile(source)
  const record = src => ({ observations: [{ photos: [] }, { photos: [{ src }] }] })
  const records = [record('/images/posts/id/cover.jpg'), record('/images/posts/id/cover.jpg'), record('/images/posts/id/missing.jpg'), record('https://example.org/image.jpg')]
  await prepareCoverPreviews(records, root)
  const output = path.join(root, 'public/thumbs/posts/id/cover.cover-v1.webp')
  const image = await sharp(await readFile(output)).metadata()
  assert.deepEqual([image.width, image.height, image.format], [1200, 800, 'webp'])
  assert.deepEqual(await readFile(source), bytes)
  const modified = (await stat(output)).mtimeMs
  await prepareCoverPreviews(records, root)
  assert.equal((await stat(output)).mtimeMs, modified)
  await assert.rejects(stat(path.join(root, 'public/thumbs/posts/id/missing.cover-v1.webp')), { code: 'ENOENT' })
})

test('self-hosted font preparation includes WOFF2 binaries and both redistribution licenses', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'fungarium-fonts-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await prepareFonts(root)
  for (const file of ['dm-sans-latin-variable.woff2', 'dm-sans-latin-ext-variable.woff2', 'libre-caslon-display-latin.woff2']) assert.equal((await readFile(path.join(root, 'public/fonts', file))).subarray(0, 4).toString(), 'wOF2')
  for (const file of ['DM-Sans-OFL.txt', 'Libre-Caslon-Display-OFL.txt']) assert.match(await readFile(path.join(root, 'public/fonts', file), 'utf8'), /SIL OPEN FONT LICENSE/u)
})
