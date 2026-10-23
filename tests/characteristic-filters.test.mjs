import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  CHARACTERISTIC_GROUPS, summarizeCharacteristics, buildCharacteristicFilterIndex,
  readCharacteristicSelections, setCharacteristicSelection, clearCharacteristicSelections,
  matchesCharacteristics, characteristicFacetCounts,
} from '../src/lib/characteristic-filters.mjs'
import { filterCatalog } from '../src/lib/catalog.mjs'

const complete = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'))
const index = JSON.parse(await readFile(new URL('../src/data/index.json', import.meta.url), 'utf8'))
const fixture = [
  { id: 'a', characteristics: { cap: ['convex'], 'spore-print': ['white'], ecology: ['saprotrophic'] } },
  { id: 'b', characteristics: { cap: ['flat'], 'spore-print': ['brown'], ecology: ['saprotrophic'] } },
  { id: 'c', characteristics: { cap: ['flat'], 'spore-print': ['white'], ecology: ['parasitic'] } },
]

test('characteristic filters match alternatives within a category and require all selected categories', () => {
  assert.deepEqual(fixture.filter(item => matchesCharacteristics(item, { cap: ['convex', 'flat'], 'spore-print': ['white'] })).map(item => item.id), ['a', 'c'])
  assert.deepEqual(fixture.filter(item => matchesCharacteristics(item, { cap: ['convex', 'flat'], 'spore-print': ['white'], ecology: ['saprotrophic'] })).map(item => item.id), ['a'])
  assert.equal(matchesCharacteristics(fixture[0], { cap: ['not-a-recorded-value'] }), false)
})

test('facet counts incorporate all other characteristics but exclude their own selection', () => {
  const groups = [
    { id: 'cap', options: [{ value: 'flat' }, { value: 'convex' }] },
    { id: 'spore-print', options: [{ value: 'white' }, { value: 'brown' }] },
  ]
  const counts = characteristicFacetCounts(fixture, { cap: ['convex'], 'spore-print': ['white'] }, groups)
  assert.deepEqual(counts.cap, { flat: 1, convex: 1 })
  assert.deepEqual(counts['spore-print'], { white: 1, brown: 0 })
})

test('unknown source information and explicit absence remain distinct from uncertain edibility', () => {
  const missing = summarizeCharacteristics({ traits: [] })
  assert.equal(Object.keys(missing).length, CHARACTERISTIC_GROUPS.length)
  assert.deepEqual(missing.cap, ['unrecorded'])
  const uncertain = summarizeCharacteristics({ traits: [{ label: 'Edibility', text: 'Edibility uncertain.' }] })
  assert.deepEqual(uncertain.edibility, ['uncertain'])
  const earthstar = summarizeCharacteristics(complete.species.find(item => item.id === 'geastrum-fimbriatum').science)
  assert.deepEqual(earthstar.cap, ['absent'])
})

test('every characteristic option and count is generated from the newest scientific profile', () => {
  assert.deepEqual(index.characteristicFilters, buildCharacteristicFilterIndex(complete.species))
  assert.equal(index.characteristicFilters.length, CHARACTERISTIC_GROUPS.length)
  for (const item of complete.species) {
    const record = index.species.find(candidate => candidate.id === item.id)
    assert.deepEqual(record.characteristics, summarizeCharacteristics(item.science))
  }
  for (const group of index.characteristicFilters) for (const option of group.options) {
    const matching = index.species.filter(item => item.characteristics[group.id].includes(option.value))
    assert.equal(option.count, matching.length)
    assert.ok(option.count > 0)
  }
})

test('taxonomy and multiple mycological selections narrow the same result set', () => {
  const result = filterCatalog(index.species, { genus: 'Amanita', characteristics: { 'spore-print': ['white'], attachment: ['free'], cap: ['convex'] } })
  assert.ok(result.some(item => item.id === 'amanita-muscaria'))
  assert.ok(result.every(item => item.genus === 'Amanita' && item.characteristics['spore-print'].includes('white') && item.characteristics.attachment.includes('free') && item.characteristics.cap.includes('convex')))
  assert.deepEqual(filterCatalog(index.species, { genus: 'Agaricus', characteristics: { 'spore-print': ['white'] } }), [])
})

test('URL selections support multiple values, category clears and characteristic-only resets', () => {
  const query = { genus: 'Amanita', q: 'muscaria', 'mc.cap': ['flat', 'convex', 'flat'], 'mc.spore-print': 'white' }
  assert.deepEqual(readCharacteristicSelections(query), { cap: ['flat', 'convex'], 'spore-print': ['white'] })
  const removed = setCharacteristicSelection(query, 'cap', [])
  assert.equal(Object.hasOwn(removed, 'mc.cap'), false)
  assert.equal(removed['mc.spore-print'], 'white')
  assert.deepEqual(clearCharacteristicSelections(query), { genus: 'Amanita', q: 'muscaria' })
  assert.deepEqual(setCharacteristicSelection({}, 'cap', ['convex', 'flat', 'convex'])['mc.cap'], ['convex', 'flat'])
  assert.deepEqual(query['mc.cap'], ['flat', 'convex', 'flat'])
})
