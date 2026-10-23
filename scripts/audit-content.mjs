import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { instagramMetaDirectory } from './project-paths.mjs'
import { parseCaption, isFungiCaption } from './content-lib.mjs'

const captionDirectory = instagramMetaDirectory()
for (const file of (await readdir(captionDirectory)).filter(file => /_\d{4}-\d{2}-\d{2}_[\w-]+\.txt$/u.test(file))) {
  const caption = await readFile(path.join(captionDirectory, file), 'utf8')
  if (!isFungiCaption(caption)) continue
  const post = parseCaption(caption)
  const issues = []
  if (!post.science.traits.length) issues.push('no scientific description')
  if (!post.science.taxonomy.length) issues.push('no classification')
  if (!post.science.gbifUrl) issues.push('no direct GBIF link')
  if (!post.science.publication) issues.push('no publication')
  if (!post.observedAt) issues.push('no observation date')
  if (!post.photography.length) issues.push('no photo details')
  if (post.latinName.split(' ').length === 1) issues.push('genus-level identification')
  if (issues.length) console.info(`${file}: ${issues.join('; ')}`)
}
