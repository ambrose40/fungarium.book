import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { root } from '../scripts/build-content.mjs'
import { parseCaption, scientificName, speciesId, groupSpecies, isFungiCaption } from '../scripts/content-lib.mjs'

const read = filename => readFile(path.join(root, filename), 'utf8')
const generated = JSON.parse(await read('src/data/posts.json'))
const get = id => generated.species.find(item => item.id === id)

test('scientific grouping ignores authorities but preserves varieties and forms', () => {
  assert.equal(scientificName('Agaricus bitorquis (Quél.) Sacc.'), 'Agaricus bitorquis')
  assert.equal(scientificName('Amanita muscaria var. formosa Pers.'), 'Amanita muscaria var. formosa')
  assert.equal(scientificName('Ciboria amentacea f. alba'), 'Ciboria amentacea f. alba')
  assert.notEqual(speciesId('Amanita muscaria'), speciesId('Amanita muscaria var. formosa'))
})

test('old captions separate scientific ecology from observed habitat and preserve source', async () => {
  const caption = await read('boletus-edulis_2022-09-22_CtSIj_MsP0C.txt')
  const post = parseCaption(caption, { shortcode: 'CtSIj_MsP0C', date: '2022-09-22' })
  assert.equal(post.caption, caption)
  assert.match(post.habitat, /near human habitat/)
  assert.doesNotMatch(post.habitat, /ecology is mycorrhizal/)
  assert.match(post.science.raw, /ecology is mycorrhizal/)
  assert.equal(post.science.commonNames.length, 6)
  assert.match(post.weather, /Forest shade/)
  assert.ok(post.photography.some(line => line.includes('Bluetooth') || line.includes('bluetooth')))
  assert.ok(post.hashtags.includes('värska'))
})

test('newer captions distinguish bibliography from photo counts and use GBIF taxon links', async () => {
  const post = parseCaption(await read('agaricus-bernardii_2026-09-05_Dc6V9PGjBBa.txt'))
  assert.equal(post.science.gbifUrl, 'https://www.gbif.org/taxon/65LV4')
  assert.match(post.science.publication, /1878/)
  assert.doesNotMatch(post.science.publication, /6 photos/)
  assert.ok(post.photography.some(line => line.includes('6 photos')))
  assert.equal(post.family, 'Agaricaceae')
  assert.ok(post.science.traits.some(item => item.label === 'Microscopy'))
  assert.ok(post.science.traits.some(item => item.label === 'Hymenium'))
  assert.ok(post.science.traits.every(item => !item.label.includes('ℹ')))
  assert.match(post.weather, /16°C/)
})

test('non-gilled fungi using cross markers and slime-mould classification are parsed', async () => {
  const mould = parseCaption(await read('hypomyces-luteovirens_2023-08-13_Cv5WCuvsACl.txt'))
  assert.match(mould.science.raw, /Hymenium: Not applicable/)
  assert.match(mould.habitat, /Parasite growing on Russula/)
  const slime = parseCaption(await read('ceratiomyxa-fruticulosa_2026-07-25_DbWAJ-iDDQg.txt'))
  assert.equal(slime.family, 'Ceratiomyxaceae')
  assert.doesNotMatch(slime.science.publication, /3 images/)
  assert.ok(slime.photography.some(line => line.includes('3 images')))
})

test('records without morphology still retain habitat, publication and photographic details', async () => {
  const post = parseCaption(await read('trametes-hirsuta_2023-04-15_CrEBU1Zoj3-.txt'))
  assert.equal(post.science.traits.length, 0)
  assert.match(post.habitat, /dead alder trunk/)
  assert.ok(post.photography.some(line => line.includes('Artcise')))
  assert.match(post.science.publication, /1924/)
  assert.equal(post.science.references[0], 'https://bit.ly/409GlQo')
})

test('revised duplicate identification uses the final scientific block', async () => {
  const post = parseCaption(await read('amanita-muscaria_2023-09-10_CxBLMJGsB-n.txt'))
  assert.match(post.science.raw, /basal clamps absent/)
  assert.doesNotMatch(post.science.raw, /One of the most iconic/)
  assert.doesNotMatch(post.science.raw, /ISO 1600/)
})

test('species profile comes entirely from its newest date; no old fields are backfilled', () => {
  const older = parseCaption('🆔 Example fungus Author\n🍄 OldFamily / OldClass\n🇺🇸 Old name\nℹ️ Cap: Old cap\n🔬 Old spores\n📷 Old camera', { shortcode: 'older123', date: '2024-01-01' })
  const newer = parseCaption('🆔 Example fungus NewAuthor\n🍄 NewFamily / NewOrder / NewClass\nℹ️ Cap: New cap\n📷 New camera', { shortcode: 'newer123', date: '2026-01-01' })
  const [result] = groupSpecies([older, newer])
  assert.equal(result.scienceYear, '2026')
  assert.equal(result.family, 'NewFamily')
  assert.deepEqual(result.science.commonNames, [])
  assert.doesNotMatch(result.science.raw, /Old spores|Old cap/)
  assert.equal(result.observations.length, 2)
})

test('real multi-year species preserves all encounters and its newest profile', () => {
  const boletus = get('boletus-edulis')
  assert.equal(boletus.scienceYear, '2025')
  assert.equal(boletus.observations.length, 4)
  assert.equal(boletus.science.gbifUrl, 'https://www.gbif.org/species/5954958')
  assert.equal(boletus.observations.at(-1).science.gbifUrl, 'https://www.gbif.org/species/2537958')
  assert.equal(get('amanita-muscaria').scienceYear, '2026')
  assert.ok(get('amanita-muscaria-var-formosa'))
})

test('every local fungal record is represented once with correct filename shortcode and date', async () => {
  const expected = []
  const allPosts = generated.species.flatMap(item => item.observations)
  for (const filename of await readdir(root)) {
    const match = filename.match(/^(.+)_(\d{4}-\d{2}-\d{2})_([\w-]+)\.txt$/u)
    if (!match || !isFungiCaption(await read(filename))) continue
    expected.push(filename)
    const post = allPosts.find(item => item.sourceFile === filename)
    assert.ok(post, `Missing ${filename}`)
    assert.equal(post.date, match[2])
    assert.equal(post.shortcode, /^x+$/i.test(match[3]) ? null : match[3])
    assert.equal(post.instagramUrl, post.shortcode ? `https://www.instagram.com/p/${match[3]}/` : null)
  }
  assert.equal(allPosts.length, expected.length)
  assert.equal(new Set(allPosts.map(post => post.id)).size, allPosts.length)
  assert.equal(generated.metadata.postCount, allPosts.length)
  assert.equal(generated.metadata.speciesCount, generated.species.length)
  for (const item of generated.species) {
    const newest = item.observations[0]
    assert.ok(item.observations.every(post => post.date <= newest.date))
    assert.equal(item.scienceYear, newest.date.slice(0, 4))
    assert.deepEqual(item.science, newest.science)
    assert.ok(item.observations.every(post => post.speciesId === item.id))
  }
})

test('plant records are excluded while fungal plant pathogens are retained', () => {
  assert.equal(isFungiCaption('🆔 Equisetum arvense L.\n🌸 Equisetaceae / Polypodiopsida'), false)
  assert.ok(get('taphrina-padi'))
  assert.ok(get('antherospora-scillae'))
})
