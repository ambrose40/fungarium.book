import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { isFungiCaption, parseCaption, validateExport, groupSpecies } from './content-lib.mjs'
import { prepareBranding } from './prepare-branding.mjs'
import { summarizeCharacteristics, buildCharacteristicFilterIndex } from '../src/lib/characteristic-filters.mjs'
import { TOP_NINE_SLIDES } from '../src/lib/top-nine.mjs'
import { root, instagramMetaDirectory } from './project-paths.mjs'
import { buildScientificSearchFields, summarizeScientificText } from '../src/lib/scientific-search.mjs'
import { classifyOrganism } from '../src/lib/organism-groups.mjs'
import { recordedTaxonomicClass } from '../src/lib/catalog.mjs'

export { root } from './project-paths.mjs'
async function optionalJson(file, fallback) {
  try { return JSON.parse(await readFile(path.join(root, file), 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error }
}

export async function buildContent() {
  await prepareBranding(root)
  const captionDirectory = instagramMetaDirectory()
  const entries = await readdir(captionDirectory)
  const posts = new Map()
  let unlinkedPosts = 0
  for (const filename of entries.sort()) {
    const match = filename.match(/^(.+)_(\d{4}-\d{2}-\d{2})_([\w-]+)\.txt$/u)
    if (!match) continue
    const caption = (await readFile(path.join(captionDirectory, filename), 'utf8')).replace(/^\uFEFF/u, '').trim()
    if (!isFungiCaption(caption)) continue
    if (/^x+$/i.test(match[3])) unlinkedPosts++
    const post = parseCaption(caption, { shortcode: match[3], date: match[2], sourceFile: filename, filenameSpecies: match[1] })
    if (post) posts.set(post.id, post)
  }
  const localPostCount = posts.size
  const exported = await optionalJson('content/instagram-export.json', null)
  const manifest = await optionalJson('content/media-manifest.json', {})
  if (exported) {
    validateExport(exported)
    const localRecords = new Map(posts)
    // A complete account export is authoritative about which posts are currently published.
    if (exported.complete) posts.clear()
    for (const item of exported.posts) {
      if (!isFungiCaption(item.caption)) continue
      const local = localRecords.get(item.shortcode)
      const post = parseCaption(item.caption, {
        shortcode: item.shortcode, date: local?.date, timestamp: item.timestamp,
        sourceFile: local?.sourceFile, source: 'instagram-export', photos: manifest[item.shortcode] || [],
      })
      if (post) posts.set(post.id, post)
    }
  }
  const result = [...posts.values()].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
  for (const post of result) {
    const imagePath = `images/posts/${post.id}`
    await mkdir(path.join(root, 'public', imagePath), { recursive: true })
    await mkdir(path.join(root, 'public/thumbs/posts', post.id), { recursive: true })
    let files = []
    try { files = await readdir(path.join(root, 'public', imagePath)) } catch (error) { if (error.code !== 'ENOENT') throw error }
    const images = files.filter(file => /\.(?:jpe?g|png|webp|avif)$/iu.test(file)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    const localPhotos = []
    for (const file of images) {
      const basename = path.parse(file).name
      let thumb = `/${imagePath}/${file}`
      for (const extension of ['webp', 'jpg', 'jpeg', 'png', 'avif']) {
        const candidate = `thumbs/posts/${post.id}/${basename}.${extension}`
        try { await readFile(path.join(root, 'public', candidate)); thumb = `/${candidate}`; break } catch (error) { if (error.code !== 'ENOENT') throw error }
      }
      localPhotos.push({ src: `/${imagePath}/${file}`, thumb, alt: `${post.latinName} — ${post.date}` })
    }
    if (localPhotos.length) post.photos = localPhotos
  }
  const species = groupSpecies(result).map(item => ({
    ...item,
    taxonomicClass: recordedTaxonomicClass(item.science.taxonomy),
    organismGroup: classifyOrganism(item.science.taxonomy, item.observations[0].caption),
    characteristics: summarizeCharacteristics(item.science),
  }))
  const characteristicFilters = buildCharacteristicFilterIndex(species)
  const scientificSearchFields = buildScientificSearchFields(species)
  const content = {
    metadata: {
      username: 'fungarium.info',
      source: exported ? 'instagram-export' : 'local-captions',
      complete: exported?.complete === true,
      exportedAt: exported?.exportedAt || null,
      profilePostCount: exported?.profilePostCount ?? null,
      exportedPostCount: exported?.posts.length || 0,
      localPostCount, unlinkedPosts,
      postCount: result.length,
      speciesCount: species.length,
      photoCount: result.reduce((count, post) => count + post.photos.length, 0),
      postsMissingPhotos: result.filter(post => !post.photos.length).length,
    },
    species,
  }
  await mkdir(path.join(root, 'src/data'), { recursive: true })
  await mkdir(path.join(root, 'public/images'), { recursive: true })
  await Promise.all(TOP_NINE_SLIDES.map(slide => copyFile(path.join(root, slide.source), path.join(root, 'public', slide.src.replace(/^\//u, '')))))
  await writeFile(path.join(root, 'src/data/posts.json'), JSON.stringify(content, null, 2) + '\n')
  // The gallery loads only a compact index; full captions are loaded per species page.
  await mkdir(path.join(root, 'src/data/species'), { recursive: true })
  await Promise.all(species.map(item => writeFile(path.join(root, `src/data/species/${item.id}.json`), JSON.stringify(item))))
  const index = species.map(item => ({
    id: item.id, latinName: item.latinName, identification: item.identification,
    genus: item.genus, family: item.family, taxonomicClass: item.taxonomicClass, commonName: item.commonName,
    organismGroup: item.organismGroup,
    latestDate: item.latestDate, hashtags: item.hashtags,
    characteristics: item.characteristics,
    science: { commonNames: item.science.commonNames, gbifUrl: item.science.gbifUrl, searchText: summarizeScientificText(item.science) },
    observations: item.observations.map(post => ({ date: post.date, location: post.location, photos: post.photos })),
  }))
  await writeFile(path.join(root, 'src/data/index.json'), JSON.stringify({ metadata: content.metadata, species: index, characteristicFilters, scientificSearchFields }))
  console.info(`Content: ${content.metadata.postCount} fungi observations, ${content.metadata.speciesCount} species, ${content.metadata.photoCount} photos; ${unlinkedPosts} observations without Instagram IDs.`)
  return content
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildContent()
