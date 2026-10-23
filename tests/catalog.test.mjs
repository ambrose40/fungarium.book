import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { normalizeSearch, buildTaxonomyIndex, filterCatalog, setTaxonomyFilter, normalizeTaxonomyQuery, recordedTaxonomicClass } from '../src/lib/catalog.mjs'

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

test('taxonomy classes follow the recorded family/class and family/order/class formats', () => {
  assert.equal(recordedTaxonomicClass(['Boletaceae', 'Agaricomycetes']), 'Agaricomycetes')
  assert.equal(recordedTaxonomicClass(['Ceratiomyxaceae', 'Ceratiomyxales', 'Protosteliomycetes']), 'Protosteliomycetes')
  assert.equal(recordedTaxonomicClass(['OnlyFamily']), '')
  assert.equal(recordedTaxonomicClass(), '')
})

test('class lists count distinct taxa and omit missing classifications', () => {
  const result = buildTaxonomyIndex([
    { id: 'a', taxonomicClass: 'Agaricomycetes', observations: [{}, {}] },
    { id: 'b', taxonomicClass: 'Agaricomycetes', observations: [{}] },
    { id: 'b', taxonomicClass: 'Agaricomycetes', observations: [{}] },
    { id: 'c', taxonomicClass: 'Myxogastria' }, { id: 'd', taxonomicClass: '' },
  ])
  assert.deepEqual(result.classes, [{ name: 'Agaricomycetes', count: 2 }, { name: 'Myxogastria', count: 1 }])
  const real = buildTaxonomyIndex(species).classes
  assert.equal(real.length, new Set(species.map(item => item.taxonomicClass).filter(Boolean)).size)
  assert.equal(real.reduce((sum, item) => sum + item.count, 0), species.filter(item => item.taxonomicClass).length)
})

test('class filters match exactly, compose with other filters, and preserve legacy taxonomy precedence', () => {
  const selected = filterCatalog(species, { taxonomicClass: 'Myxogastria', organismGroups: ['slime-moulds'] })
  assert.ok(selected.some(item => item.id === 'badhamia-utricularis'))
  assert.ok(selected.every(item => item.taxonomicClass === 'Myxogastria'))
  assert.deepEqual(filterCatalog(species, { taxonomicClass: 'Protosteliomycetes' }).map(item => item.id), ['ceratiomyxa-fruticulosa'])
  assert.deepEqual(filterCatalog(species, { taxonomicClass: 'Agarico' }), [])
  assert.deepEqual(filterCatalog(species, { taxonomicClass: 'Agaricomycetes', search: 'Boletus edulis', scope: 'scientific', year: '2025', organismGroups: ['fungi'], scientificSearches: { stipe: 'reticulate' }, characteristics: { hymenium: ['pores'] } }).map(item => item.id), ['boletus-edulis'])
  assert.deepEqual(filterCatalog(species, { genus: 'Ceratiomyxa', taxonomicClass: 'Agaricomycetes' }).map(item => item.id), ['ceratiomyxa-fruticulosa'])
  assert.ok(filterCatalog(species, { search: 'Myxogastria' }).some(item => item.id === 'badhamia-utricularis'))
  assert.deepEqual(filterCatalog(species, { search: 'Myxogastria', scope: 'scientific' }), [])
})

test('class selection replaces genus and family while retaining description and organism selections', () => {
  const original = { genus: 'Boletus', q: 'pores', 'sc.stipe': 'reticulate', organisms: 'fungi', 'mc.hymenium': ['pores'], sort: 'newest' }
  const selected = setTaxonomyFilter(original, 'class', 'Agaricomycetes')
  assert.equal(selected.class, 'Agaricomycetes')
  assert.equal(Object.hasOwn(selected, 'genus'), false)
  assert.equal(selected['sc.stipe'], 'reticulate')
  assert.equal(selected.organisms, 'fungi')
  assert.equal(selected.sort, 'newest')
  const family = setTaxonomyFilter(selected, 'family', 'Boletaceae')
  assert.equal(Object.hasOwn(family, 'class'), false)
  assert.equal(family.family, 'Boletaceae')
  assert.equal(Object.hasOwn(setTaxonomyFilter(selected, 'genus', 'Boletus'), 'class'), false)
  assert.deepEqual(normalizeTaxonomyQuery({ class: 'Myxogastria', family: 'Boletaceae' }), { family: 'Boletaceae' })
  assert.deepEqual(normalizeTaxonomyQuery({ class: ['Myxogastria'], family: 'Boletaceae', genus: 'Boletus' }), { genus: 'Boletus' })
  assert.equal(Object.hasOwn(setTaxonomyFilter(selected, 'class', ''), 'class'), false)
  assert.equal(original.genus, 'Boletus')
})

test('generated class labels come only from the latest scientific taxonomy', async () => {
  const full = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'))
  for (const item of full.species) {
    const expected = item.science.taxonomy.length >= 2 ? item.science.taxonomy.at(-1) : ''
    assert.equal(item.taxonomicClass, expected, item.id)
    assert.equal(species.find(record => record.id === item.id).taxonomicClass, expected, item.id)
  }
})
