import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  buildScientificSearchFields, scientificFieldId, summarizeScientificText,
  readScientificSearches, setScientificSearch, clearScientificSearches,
} from '../src/lib/scientific-search.mjs'
import { filterCatalog, setTaxonomyFilter } from '../src/lib/catalog.mjs'
import { parseCaption, groupSpecies } from '../scripts/content-lib.mjs'
import { readCatalog } from './helpers/catalog.mjs'

const index = await readCatalog()
const full = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'))

test('scientific fields merge label casing, count taxa once, and retain specialist and newly recorded categories', () => {
  const science = { traits: [
    { label: 'cap', text: 'Convex and red' },
    { label: 'Cap', text: 'Convex and red' },
    { label: 'Cap', text: 'Smooth when young' },
    { label: 'Peridium', text: 'Papery' },
    { label: 'Novel structure / stage', text: 'A newly described structure' },
  ] }
  const snapshot = JSON.stringify(science)
  const fields = buildScientificSearchFields([{ science }, { science: { traits: [{ label: 'CAP', text: 'Flat' }] } }])
  assert.deepEqual(fields.find(field => field.id === 'cap'), { id: 'cap', label: 'Cap', count: 2 })
  assert.ok(fields.some(field => field.id === 'novel-structure-stage'))
  assert.equal(summarizeScientificText(science).cap, 'Convex and red\nSmooth when young')
  assert.equal(summarizeScientificText(science).peridium, 'Papery')
  assert.equal(scientificFieldId(' Hymenium Attachment '), 'hymenium-attachment')
  assert.equal(JSON.stringify(science), snapshot)
})

test('category searches stay within their field and combine with scientific names and other categories using AND', () => {
  const items = [
    { id: 'a', latinName: 'Example alpha', identification: 'Example alpha', observations: [], hashtags: [], science: { traits: [{ label: 'Cap', text: 'Convex, red and smooth' }, { label: 'Hymenium', text: 'White gills' }] } },
    { id: 'b', latinName: 'Example beta', identification: 'Example beta', observations: [], hashtags: [], science: { traits: [{ label: 'Cap', text: 'Flat and white' }, { label: 'Hymenium', text: 'Red pores' }] } },
  ]
  assert.deepEqual(filterCatalog(items, { scientificSearches: { cap: '  RED   convex ', hymenium: 'gills' } }).map(item => item.id), ['a'])
  assert.deepEqual(filterCatalog(items, { scientificSearches: { hymenium: 'convex' } }), [])
  assert.deepEqual(filterCatalog(items, { search: 'alpha', scope: 'scientific', scientificSearches: { cap: 'red' } }).map(item => item.id), ['a'])
  assert.deepEqual(filterCatalog(items, { search: 'beta', scope: 'scientific', scientificSearches: { cap: 'red' } }), [])
  assert.deepEqual(filterCatalog(items, { search: 'white', scope: 'trait:cap' }).map(item => item.id), ['b'])
  assert.deepEqual(filterCatalog(items, { search: 'white', scope: 'trait:hymenium' }).map(item => item.id), ['a'])
  assert.deepEqual(filterCatalog(items, { search: 'white' }).map(item => item.id), ['a', 'b'])
  assert.deepEqual(filterCatalog(items, { search: 'white', scope: 'scientific' }), [])
  assert.deepEqual(filterCatalog(items, { search: 'function', scope: 'trait:constructor' }), [])
  assert.deepEqual(filterCatalog(items, { scientificSearches: { constructor: 'function' } }), [])
})

test('description searches use only the latest profile and never backfill an older omitted category', () => {
  const old = parseCaption('🆔 Example fungus\n🍄 Exampleaceae / Exampleclass\nℹ️ Cap: obsoletecrimson\n🧪 obsoleteviolet\n📷 Camera', { shortcode: 'older123', date: '2024-01-01' })
  const latest = parseCaption('🆔 Example fungus\n🍄 Exampleaceae / Exampleclass\nℹ️ Cap: freshorange\n📷 Camera', { shortcode: 'newer123', date: '2026-01-01' })
  const species = groupSpecies([old, latest])
  assert.equal(filterCatalog(species, { scientificSearches: { cap: 'freshorange' } }).length, 1)
  assert.deepEqual(filterCatalog(species, { search: 'obsoletecrimson' }), [])
  assert.deepEqual(filterCatalog(species, { scientificSearches: { 'chemical-reactions': 'obsoleteviolet' } }), [])
})

test('generated search text and available fields come entirely from each latest scientific profile', () => {
  assert.deepEqual(index.scientificSearchFields, buildScientificSearchFields(full.species))
  const names = new Set(index.scientificSearchFields.map(field => field.id))
  for (const id of ['hymenium', 'cap', 'hymenium-attachment', 'stipe', 'spore-print', 'ecology', 'edibility', 'fruit-body', 'dimensions', 'flesh', 'chemical-reactions', 'odour', 'taste', 'microscopy', 'overview', 'peridium', 'plasmodium-phase', 'sporangia', 'uses-compounds']) assert.ok(names.has(id), id)
  for (const item of full.species) {
    const compact = index.species.find(record => record.id === item.id)
    assert.deepEqual(compact.science.searchText, summarizeScientificText(item.science), item.id)
  }
  for (const field of index.scientificSearchFields) assert.equal(field.count, index.species.filter(item => item.science.searchText[field.id]).length, field.id)
  assert.ok(filterCatalog(index.species, { scope: 'trait:stipe', search: 'reticulate' }).some(item => item.id === 'boletus-edulis'))
  assert.ok(filterCatalog(index.species, { scope: 'trait:plasmodium-phase', search: 'watery' }).some(item => item.id === 'ceratiomyxa-fruticulosa'))
})

test('scientific query fields preserve other selections and support individual and category-only clearing', () => {
  const original = { q: 'boletus', scope: 'scientific', genus: 'Boletus', organisms: 'fungi', 'mc.hymenium': ['pores'] }
  const cap = setScientificSearch(original, 'cap', 'convex smooth')
  const stipe = setScientificSearch(cap, 'stipe', 'reticulate')
  const fields = [{ id: 'cap' }, { id: 'stipe' }]
  assert.deepEqual(readScientificSearches({ ...stipe, 'sc.unknown': 'ignore', 'sc.cap': ['convex smooth', 'ignored duplicate'] }, fields), { cap: 'convex smooth', stipe: 'reticulate' })
  assert.deepEqual(readScientificSearches(setScientificSearch(stipe, 'cap', ''), fields), { stipe: 'reticulate' })
  assert.deepEqual(clearScientificSearches(stipe), original)
  const family = setTaxonomyFilter(stipe, 'family', 'Boletaceae')
  assert.equal(family['sc.stipe'], 'reticulate')
  assert.equal(family.organisms, 'fungi')
  assert.equal(Object.hasOwn(family, 'genus'), false)
  assert.equal(Object.hasOwn(original, 'sc.cap'), false)
})
