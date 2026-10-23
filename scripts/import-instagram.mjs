import { readFile, writeFile, mkdir, rename, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { isFungiCaption, validateExport } from './content-lib.mjs'
import { buildContent, root } from './build-content.mjs'

export async function importInstagram(input, onProgress = () => {}) {
  const data = validateExport(input)
  const directory = path.join(root, 'public/images/instagram')
  await mkdir(directory, { recursive: true })
  await mkdir(path.join(root, 'content'), { recursive: true })
  const manifest = {}
  const jobs = data.posts.filter(post => isFungiCaption(post.caption)).flatMap(post => {
    manifest[post.shortcode] = []
    return post.photos.map((photo, index) => ({ post, photo, index }))
  })
  let done = 0
  let next = 0
  const failures = []
  async function worker() {
    while (next < jobs.length) {
      const { post, photo, index } = jobs[next++]
      const filename = `${post.shortcode}-${index + 1}.jpg`
      const destination = path.join(directory, filename)
      try {
        let exists = false
        try { await access(destination); exists = true } catch {}
        if (!exists) {
          let response
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              response = await fetch(photo.url, { redirect: 'error', signal: AbortSignal.timeout(45000) })
              if (response.ok && response.headers.get('content-type')?.startsWith('image/')) break
              throw new Error(`Photo server returned ${response.status}`)
            } catch (error) {
              if (attempt === 2) throw error
              await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)))
            }
          }
          const buffer = Buffer.from(await response.arrayBuffer())
          if (!buffer.length || buffer.length > 30 * 1024 * 1024) throw new Error('Invalid photo size')
          await writeFile(destination + '.tmp', buffer)
          await rename(destination + '.tmp', destination)
        }
        manifest[post.shortcode].push({ src: `/images/instagram/${filename}`, width: photo.width, height: photo.height, alt: photo.alt || '', order: index })
      } catch (error) {
        failures.push({ shortcode: post.shortcode, photo: index + 1, error: error.message })
      }
      onProgress({ done: ++done, total: jobs.length })
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker))
  for (const photos of Object.values(manifest)) photos.sort((a, b) => a.order - b.order)
  await writeFile(path.join(root, 'content/instagram-export.json'), JSON.stringify(data, null, 2))
  await writeFile(path.join(root, 'content/media-manifest.json'), JSON.stringify(manifest, null, 2))
  const content = await buildContent()
  return { ...content.metadata, downloaded: jobs.length - failures.length, failures }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] || path.join(root, 'fungarium-instagram-export.json')
  try {
    const result = await importInstagram(JSON.parse(await readFile(file, 'utf8')), ({ done, total }) => {
      if (done % 20 === 0 || done === total) console.info(`Photos: ${done}/${total}`)
    })
    console.info(JSON.stringify(result, null, 2))
    if (result.failures.length) process.exitCode = 1
  } catch (error) {
    console.error(`Import failed: ${error.message}`)
    process.exitCode = 1
  }
}
