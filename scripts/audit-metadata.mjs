import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { root } from './project-paths.mjs'
import { normalizeHashtag, uniqueHashtags } from '../src/lib/hashtags.mjs'
import { scientificText } from '../src/lib/scientific-search.mjs'

export function metadataAudit(content) {
  const posts = content.species.flatMap(item => item.observations)
  const variants = new Map()
  for (const post of posts) for (const tag of post.hashtags) {
    const key = normalizeHashtag(tag)
    if (!variants.has(key)) variants.set(key, new Set())
    variants.get(key).add(tag)
  }
  const profileReference = item => ({ id: item.id, sourceFile: item.scienceSource.file })
  const missingProfileFields = {
    overview: content.species.filter(item => !scientificText(item).overview).map(profileReference),
    scientificDescription: content.species.filter(item => !item.science.traits.length).map(profileReference),
    classification: content.species.filter(item => !item.science.taxonomy.length).map(profileReference),
    gbifReference: content.species.filter(item => !item.science.gbifUrl).map(profileReference),
    publication: content.species.filter(item => !item.science.publication).map(profileReference),
  }
  return {
    speciesCount: content.species.length,
    observationCount: posts.length,
    hashtags: {
      uniqueCount: uniqueHashtags(posts.flatMap(post => post.hashtags)).length,
      observationsWithoutHashtags: posts.filter(post => !post.hashtags.length).map(post => post.sourceFile),
      caseVariants: [...variants].filter(([, forms]) => forms.size > 1).map(([normalized, forms]) => ({ normalized, forms: [...forms] })),
    },
    missingProfileFields,
    missingObservationFields: Object.fromEntries(['observedAt', 'location', 'coordinates', 'weather', 'camera', 'lens'].map(field => [field, posts.filter(post => !post[field]).map(post => post.sourceFile)])),
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const content = JSON.parse(await readFile(path.join(root, 'src/data/posts.json'), 'utf8'))
  console.info(JSON.stringify(metadataAudit(content), null, 2))
}
