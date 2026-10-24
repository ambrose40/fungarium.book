import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { coverPreviewPath } from '../src/lib/image-delivery.mjs'

export async function prepareCoverPreviews(species, root) {
  const covers = [...new Map(species.map(item => item.observations.find(post => post.photos.length)?.photos[0]).filter(Boolean).map(photo => [photo.src, photo])).values()]
  let position = 0
  let written = 0
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (position < covers.length) {
      const photo = covers[position++]
      const preview = coverPreviewPath(photo)
      if (preview === photo.src) continue
      const source = path.join(root, 'public', photo.src.replace(/^\//u, ''))
      const output = path.join(root, 'public', preview.replace(/^\//u, ''))
      let original
      try { original = await stat(source) } catch (error) { if (error.code === 'ENOENT') continue; throw error }
      try { if ((await stat(output)).mtimeMs >= original.mtimeMs) continue } catch (error) { if (error.code !== 'ENOENT') throw error }
      await mkdir(path.dirname(output), { recursive: true })
      await sharp(source).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(output)
      written++
    }
  }))
  console.info(`Cover previews: ${written} updated; original photographs retained.`)
}
