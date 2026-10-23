import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { normalizeSearch, buildTaxonomyIndex, filterCatalog, setTaxonomyFilter, normalizeTaxonomyQuery } from '../src/lib/catalog.mjs'

const { species } = JSON.parse(await readFile(new URL('../src/data/index.json', import.meta.url), 'utf8'))

test('scientific search supports case, repeated spaces, partial names and authorship accents', () => {
  assert.equal(normalizeSearch('  QUÉL.  '), 'quel.')
  assert.deepEqual(filterCatalog(species, { search: '  BOLETUS   EDULIS ', scope: 'scientific' }).map(item => item.id), ['boletus-edulis'])
  assert.ok(filterCatalog(species, { search: 'amanita musc', scope: 'scientific' }).some(item => item.id === 'amanita-muscaria-var-formosa'))
  assert.ok(filterCatalog(species, { search: 'Agaricus bernardii Quel.', scope: 'scientific' }).some(item => item.id === 'agaricus-bernardii'))
})

test('scientific mode excludes common names and places while all-fields search retains them', () => {
  assert.deepEqual(filterCatalog(species, { search: 'Punane kärbseseen', scope: 'scientific' }), [])
  assert.ok(filterCatalog(species, { search: 'Punane kärbseseen' }).some(item => item.id === 'amanita-muscaria'))
  assert.deepEqual(filterCatalog(species, { search: 'Raudoja', scope: 'scientific' }), [])
  assert.ok(filterCatalog(species, { search: 'Raudoja' }).length > 0)
})

test('taxonomy lists are alphabetical, unique, omit missing names and count species rather than observations', () => {
  const items = [
    { id: 'a', genus: 'Amanita', family: 'Amanitaceae', observations: [{}, {}, {}] },
    { id: 'b', genus: 'Amanita', family: 'Amanitaceae', observations: [{}] },
    { id: 'c', genus: 'Boletus', family: 'Boletaceae', observations: [{}, {}] },
    { id: 'c', genus: 'Boletus', family: 'Boletaceae', observations: [{}, {}] },
    { id: 'd', genus: 'Unknown', family: '' },
  ]
  const result = buildTaxonomyIndex(items)
  assert.deepEqual(result.genera, [{ name: 'Amanita', count: 2 }, { name: 'Boletus', count: 1 }, { name: 'Unknown', count: 1 }])
  assert.deepEqual(result.families, [{ name: 'Amanitaceae', count: 2 }, { name: 'Boletaceae', count: 1 }])
})

test('every available genus and family is included in the generated lists', () => {
  const result = buildTaxonomyIndex(species)
  assert.equal(result.genera.length, new Set(species.map(item => item.genus).filter(Boolean)).size)
  assert.equal(result.families.length, new Set(species.map(item => item.family).filter(Boolean)).size)
  assert.equal(result.genera.reduce((sum, item) => sum + item.count, 0), species.length)
  assert.equal(result.families.reduce((sum, item) => sum + item.count, 0), species.filter(item => item.family).length)
  for (const group of result.genera) assert.ok(species.some(item => item.genus === group.name))
  for (const group of result.families) assert.ok(species.some(item => item.family === group.name))
})

test('genus matching is exact, takes precedence over a legacy family parameter, and composes with other filters', () => {
  assert.deepEqual(filterCatalog(species, { genus: 'Boletus' }).map(item => item.id).sort(), ['boletus-edulis', 'boletus-pinophilus'])
  assert.deepEqual(filterCatalog(species, { genus: 'Boletus', family: 'Amanitaceae' }).map(item => item.id).sort(), ['boletus-edulis', 'boletus-pinophilus'])
  assert.deepEqual(filterCatalog(species, { genus: 'Amanita', family: 'Amanitaceae', year: '2026', search: 'muscaria', scope: 'scientific', tag: 'amanitamuscaria' }).map(item => item.id), ['amanita-muscaria'])
  assert.deepEqual(filterCatalog(species, { genus: 'NotARecordedGenus' }), [])
})

test('selecting either taxonomy clears the other and preserves additive filters', () => {
  const query = { q: 'fungus', family: 'Boletaceae', 'mc.spore-print': ['white'], year: '2026' }
  const genus = setTaxonomyFilter(query, 'genus', 'Agaricus')
  assert.equal(genus.genus, 'Agaricus')
  assert.equal(Object.hasOwn(genus, 'family'), false)
  assert.deepEqual(genus['mc.spore-print'], ['white'])
  const family = setTaxonomyFilter(genus, 'family', 'Amanitaceae')
  assert.equal(Object.hasOwn(family, 'genus'), false)
  assert.equal(family.family, 'Amanitaceae')
  assert.equal(family.year, '2026')
  const cleared = setTaxonomyFilter(family, 'family', '')
  assert.equal(Object.hasOwn(cleared, 'family'), false)
  assert.deepEqual(cleared['mc.spore-print'], ['white'])
  assert.deepEqual(normalizeTaxonomyQuery({ genus: 'Agaricus', family: 'Amanitaceae' }), { genus: 'Agaricus' })
  assert.equal(query.family, 'Boletaceae')
})
