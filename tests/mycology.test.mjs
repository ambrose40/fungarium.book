import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getMycologicalCharacteristics } from '../src/lib/mycology.mjs'

const { species } = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'))
const profile = id => species.find(item => item.id === id).science
const categories = id => getMycologicalCharacteristics(profile(id))
const category = (items, id) => items.find(item => item.id === id)
const values = (items, id) => category(items, id)?.items.map(item => item.id) || []
const science = rows => ({ traits: rows.map(([label, text]) => ({ label, text, raw: `${label}: ${text}` })) })

test('Amanita uses its actual latest cap forms, gills, free attachment, ring/volva and poisonous/psychoactive status', () => {
  const items = categories('amanita-muscaria')
  assert.deepEqual(values(items, 'cap'), ['hemispherical', 'convex', 'flat'])
  assert.ok(values(items, 'hymenium').includes('gills'))
  assert.deepEqual(values(items, 'attachment'), ['free'])
  assert.ok(values(items, 'veil').includes('ring-volva'))
  assert.deepEqual(values(items, 'edibility'), ['poisonous', 'psychoactive'])
  assert.deepEqual(values(items, 'spore-print'), ['white'])
  assert.ok(values(items, 'surface').includes('warted'))
  assert.equal(category(items, 'spore-print').items[0].color, '#faf9ef')
})

test('Boletus has pores, a reticulate stipe, olive-brown print and choice edibility', () => {
  const items = categories('boletus-edulis')
  assert.ok(values(items, 'hymenium').includes('pores'))
  assert.ok(!values(items, 'hymenium').includes('gills'))
  assert.ok(values(items, 'stipe').includes('reticulate'))
  assert.deepEqual(values(items, 'spore-print'), ['olive-brown'])
  assert.deepEqual(values(items, 'edibility'), ['choice'])
})

test('chanterelles show false-gill ridges rather than true gills, decurrent attachment, and multiple cap stages', () => {
  const items = categories('cantharellus-cibarius')
  assert.deepEqual(values(items, 'hymenium'), ['ridges'])
  assert.deepEqual(values(items, 'attachment'), ['decurrent'])
  for (const value of ['convex', 'flat', 'funnel']) assert.ok(values(items, 'cap').includes(value))
  assert.ok(values(items, 'spore-print').includes('cream'))
  assert.ok(values(items, 'spore-print').includes('yellow'))
  assert.equal(category(items, 'spore-print').items.find(item => item.id === 'pink').tentative, true)
})

test('earthstars show their distinctive fruiting form, internal gleba, and lack of a typical cap or stipe', () => {
  const items = categories('geastrum-fimbriatum')
  assert.ok(values(items, 'body').includes('earthstar'))
  assert.deepEqual(values(items, 'cap'), ['absent'])
  assert.deepEqual(values(items, 'stipe'), ['absent'])
  assert.deepEqual(values(items, 'hymenium'), ['gleba'])
  assert.deepEqual(values(items, 'attachment'), ['not-applicable'])
  assert.deepEqual(values(items, 'edibility'), ['inedible'])
})

test('jelly fungi do not acquire gills or pores from an explicit absence statement', () => {
  const items = categories('dacrymyces-stillatus')
  assert.ok(values(items, 'body').includes('jelly'))
  assert.deepEqual(values(items, 'hymenium'), ['not-applicable'])
  assert.deepEqual(values(items, 'cap'), ['absent'])
  assert.deepEqual(values(items, 'stipe'), ['absent'])
  assert.deepEqual(values(items, 'spore-print'), ['not-applicable'])
})

test('a mildew spore mass is not confused with the colour of its mature fruiting structures', () => {
  const items = categories('podosphaera-mors-uvae')
  assert.ok(values(items, 'body').includes('mould'))
  assert.equal(category(items, 'spore-print').title, 'Spore mass')
  assert.deepEqual(values(items, 'spore-print'), ['white'])
  assert.ok(values(items, 'ecology').includes('parasitic'))
  assert.deepEqual(values(items, 'edibility'), ['unknown'])
})

test('a ringless cylindrical stipe is not an absent stipe, nor evidence of a volva', () => {
  const items = getMycologicalCharacteristics(science([
    ['Stipe', 'Cylindrical, solid; no ring; volva absent.'],
    ['Cap', 'Convex, smooth; warts absent; not depressed.'],
  ]))
  assert.deepEqual(values(items, 'stipe'), ['cylindrical', 'solid'])
  assert.deepEqual(values(items, 'veil'), ['ringless'])
  assert.deepEqual(values(items, 'cap'), ['convex'])
  assert.deepEqual(values(items, 'surface'), ['smooth'])
})

test('unknown and omitted features remain unknown instead of implying absence or edibility', () => {
  const items = getMycologicalCharacteristics(science([['Overview', 'A small woodland fungus.']]))
  for (const id of ['cap', 'hymenium', 'attachment', 'stipe', 'spore-print', 'ecology', 'edibility']) {
    assert.deepEqual(values(items, id), ['unknown'])
    assert.equal(category(items, id).items[0].label, 'Not recorded')
  }
  assert.equal(category(items, 'veil'), undefined)
  assert.deepEqual(getMycologicalCharacteristics({ traits: [] }), [])
})

test('historical consumption does not override poisonous descriptions; uncertainty and conditional edibility are distinct', () => {
  const saddle = categories('helvella-crispa')
  assert.deepEqual(values(saddle, 'edibility'), ['poisonous'])
  assert.ok(values(saddle, 'body').includes('saddle'))
  assert.ok(values(saddle, 'stipe').includes('hollow'))
  const conditional = getMycologicalCharacteristics(science([['Edibility', 'Edible only after thorough cooking.']]))
  assert.deepEqual(values(conditional, 'edibility'), ['conditional'])
  const uncertain = getMycologicalCharacteristics(science([['Edibility', 'Edibility uncertain, sometimes considered edible.']]))
  assert.deepEqual(values(uncertain, 'edibility'), ['unknown'])
  const edible = getMycologicalCharacteristics(science([['Edibility', 'Edible; not known to be toxic.']]))
  assert.deepEqual(values(edible, 'edibility'), ['edible'])
  const rawToxic = getMycologicalCharacteristics(science([['Edibility', 'Edible after thorough cooking, toxic when raw.']]))
  assert.deepEqual(values(rawToxic, 'edibility'), ['poisonous', 'conditional'])
  const poor = categories('gyrodon-lividus')
  assert.deepEqual(values(poor, 'edibility'), ['edible'])
  assert.equal(category(poor, 'edibility').items[0].label, 'Edible · poor quality')
})

test('negated attachment types and qualified ecological modes keep their meaning', () => {
  const items = getMycologicalCharacteristics(science([
    ['Hymenium Attachment', 'Adnate to decurrent; not free.'],
    ['Ecology', 'Presumably mycorrhizal; possibly saprobic.'],
  ]))
  assert.deepEqual(values(items, 'attachment'), ['adnate', 'decurrent'])
  assert.deepEqual(values(items, 'ecology'), ['mycorrhizal', 'saprotrophic'])
  assert.ok(category(items, 'ecology').items.every(item => item.tentative))
})

test('ordinary flesh colours and negated staining do not become bruising reactions', () => {
  const unchanged = getMycologicalCharacteristics(science([['Flesh', 'Pinkish-red flesh, unchanging when cut; no blue staining.']]))
  assert.deepEqual(values(unchanged, 'flesh'), ['unchanging'])
  const changed = getMycologicalCharacteristics(science([['Flesh', 'White, turning pinkish-red when cut and staining blue when bruised.']]))
  assert.deepEqual(values(changed, 'flesh'), ['blue', 'red'])
})

test('microscopic basidia or cystidia cannot supply a spore shape or ornamentation', () => {
  const items = getMycologicalCharacteristics(science([['Microscopy', 'Spores ellipsoid, smooth; basidia clavate; cystidia spiny.']]))
  assert.deepEqual(values(items, 'microscopy'), ['ellipsoid', 'smooth'])
})

test('every illustrated claim is traceable to the current scientific JSON without mutating it', () => {
  const icons = new Set()
  let illustratedSpecies = 0
  for (const item of species) {
    const original = JSON.stringify(item.science)
    const characteristics = getMycologicalCharacteristics(item.science)
    if (characteristics.length) illustratedSpecies++
    for (const feature of characteristics) {
      assert.equal(new Set(feature.items.map(value => value.id)).size, feature.items.length)
      for (const value of feature.items) {
        icons.add(value.icon)
        if (value.id !== 'unknown') assert.ok(feature.evidence.length, `${item.id}: ${feature.id} has no source`)
      }
      for (const source of feature.evidence) assert.ok(item.science.traits.some(row => row.label === source.label && row.text === source.text))
    }
    assert.equal(JSON.stringify(item.science), original)
  }
  assert.ok(illustratedSpecies > 300)
  assert.ok(icons.size > 60, `Expected genuinely varied illustrations; found ${icons.size}`)
})
