import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { extractHashtags, hasHashtag, normalizeHashtag, uniqueHashtags } from '../src/lib/hashtags.mjs'
import { parseCaption, groupSpecies } from '../scripts/content-lib.mjs'
import { filterCatalog } from '../src/lib/catalog.mjs'

test('hashtags support Unicode marks, punctuation and emoji boundaries without importing URL fragments', () => {
  const caption = '🍄#Mushrooms (#su\u0308gis), #Русский #日本語 #macro_photo https://example.org/#fragment word#internal #MUSHROOMS'
  assert.deepEqual(extractHashtags(caption), ['Mushrooms', 'sügis', 'Русский', '日本語', 'macro_photo'])
  assert.equal(normalizeHashtag(' #POLYPORE '), 'polypore')
  assert.deepEqual(uniqueHashtags(['Polypore', 'polypore', 'sügis', 'su\u0308gis']), ['Polypore', 'sügis'])
  assert.equal(hasHashtag(['sügis', 'Polypore'], '#POLYPORE'), true)
  assert.equal(hasHashtag(['sügis'], 'sugis'), false)
})

test('source captions remain exact while species hashtags are a case-insensitive union of their encounters', () => {
  const raw = '🆔 Example fungus\n🍄 Exampleaceae / Exampleclass\nℹ️ Cap: Red\n📷 Camera\n🍄#Polypore #su\u0308gis'
  const latest = parseCaption(raw, { shortcode: 'newer123', date: '2026-01-01' })
  const old = parseCaption('🆔 Example fungus\n🍄 Exampleaceae / Exampleclass\nℹ️ Cap: Old\n📷 Camera\n#polypore #forest', { shortcode: 'older123', date: '2024-01-01' })
  assert.equal(latest.caption, raw)
  const [item] = groupSpecies([old, latest])
  assert.deepEqual(item.hashtags, ['Polypore', 'sügis', 'forest'])
  assert.equal(filterCatalog([item], { tag: 'POLYPORE' }).length, 1)
  assert.equal(filterCatalog([item], { tag: '#su\u0308gis' }).length, 1)
})

test('all generated hashtag lists reflect source captions and species unions without synthesized tags', async () => {
  const content = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'))
  for (const item of content.species) {
    for (const post of item.observations) assert.deepEqual(post.hashtags, extractHashtags(post.caption), post.sourceFile)
    assert.deepEqual(item.hashtags, uniqueHashtags(item.observations.flatMap(post => post.hashtags)), item.id)
  }
})
