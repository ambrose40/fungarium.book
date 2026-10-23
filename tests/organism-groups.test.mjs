import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { classifyOrganism, readOrganismSelections, setOrganismSelections } from '../src/lib/organism-groups.mjs'
import { filterCatalog } from '../src/lib/catalog.mjs'

const { species } = JSON.parse(await readFile(new URL('../src/data/index.json', import.meta.url), 'utf8'))

test('recorded slime-mould taxonomies take precedence over historical mushroom markers', () => {
  assert.equal(classifyOrganism(['Physaraceae', 'Myxogastria'], '🍄 Physaraceae / Myxogastria'), 'slime-moulds')
  assert.equal(classifyOrganism(['Ceratiomyxaceae', 'Protosteliomycetes'], '🦠 Ceratiomyxaceae / Protosteliomycetes'), 'slime-moulds')
  assert.equal(classifyOrganism(['Exampleaceae', 'Exampleclass'], '🦠 Exampleaceae / Exampleclass'), 'slime-moulds')
  assert.equal(classifyOrganism(['Boletaceae', 'Agaricomycetes'], '🍄 Boletaceae / Agaricomycetes\nℹ️ Ecology: A parasite on slime moulds'), 'fungi')
  assert.equal(classifyOrganism([], '🆔 An unresolved taxon'), 'unclassified')
  assert.equal(classifyOrganism(['Amoebozoa'], '🆔 An unresolved amoebozoan'), 'unclassified')
})

test('fungi and slime moulds can be shown together, separately, or neither', () => {
  const slime = filterCatalog(species, { organismGroups: ['slime-moulds'] })
  assert.deepEqual(slime.map(item => item.id), [
    'badhamia-utricularis', 'ceratiomyxa-fruticulosa', 'hemitrichia-decipiens',
    'lycogala-epidendrum', 'mucilago-crustacea', 'physarum-rubiginosum', 'tubifera-ferruginosa',
  ])
  const fungi = filterCatalog(species, { organismGroups: ['fungi'] })
  assert.equal(fungi.length + slime.length, species.length)
  assert.ok(fungi.some(item => item.id === 'boletus-edulis'))
  assert.equal(filterCatalog(species, { organismGroups: ['fungi', 'slime-moulds'] }).length, species.length)
  assert.deepEqual(filterCatalog(species, { organismGroups: [] }), [])
  assert.deepEqual(filterCatalog(species, { organismGroups: ['slime-moulds'], genus: 'Ceratiomyxa', scientificSearches: { 'plasmodium-phase': 'watery' } }).map(item => item.id), ['ceratiomyxa-fruticulosa'])
  const unclassified = { id: 'unknown', organismGroup: 'unclassified' }
  assert.deepEqual(filterCatalog([unclassified]), [unclassified])
  assert.deepEqual(filterCatalog([unclassified], { organismGroups: ['fungi'] }), [])
})

test('group query selections distinguish default both from explicitly neither and retain other filters', () => {
  assert.deepEqual(readOrganismSelections({}), ['fungi', 'slime-moulds'])
  assert.deepEqual(readOrganismSelections({ organisms: ['slime-moulds', 'fungi', 'fungi'] }), ['fungi', 'slime-moulds'])
  assert.deepEqual(readOrganismSelections({ organisms: 'none' }), [])
  assert.deepEqual(readOrganismSelections({ organisms: 'invalid' }), ['fungi', 'slime-moulds'])
  const original = { q: 'cap', genus: 'Amanita', 'sc.cap': 'convex', 'mc.spore-print': ['white'] }
  const fungi = setOrganismSelections(original, ['fungi'])
  assert.equal(fungi.organisms, 'fungi')
  assert.deepEqual(readOrganismSelections(fungi), ['fungi'])
  assert.equal(setOrganismSelections(fungi, []).organisms, 'none')
  assert.deepEqual(setOrganismSelections(fungi, ['fungi', 'slime-moulds']), original)
  assert.equal(Object.hasOwn(original, 'organisms'), false)
})
