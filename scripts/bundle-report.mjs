import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { root } from './project-paths.mjs'

export function bundleReportPlugin() {
  let config
  return {
    name: 'fungarium-bundle-report',
    configResolved(value) { config = value },
    async writeBundle(options, bundle) {
      const catalog = JSON.parse(await readFile(path.join(config.root, 'src/data/index.json'), 'utf8'))
      const chunks = Object.values(bundle).filter(item => item.type === 'chunk').map(chunk => ({
        file: chunk.fileName,
        entry: chunk.isEntry,
        bytes: Buffer.byteLength(chunk.code),
        gzipBytes: gzipSync(chunk.code).byteLength,
        imports: chunk.imports,
        dynamicImports: chunk.dynamicImports,
        modules: Object.entries(chunk.modules).map(([id, details]) => ({
          id: path.relative(config.root, id).replaceAll('\\', '/'),
          renderedBytes: details.renderedLength,
        })).sort((a, b) => b.renderedBytes - a.renderedBytes),
      })).sort((a, b) => b.bytes - a.bytes)
      const byFile = new Map(chunks.map(chunk => [chunk.file, chunk]))
      const initial = new Set()
      function visit(file) {
        if (initial.has(file) || !byFile.has(file)) return
        initial.add(file)
        byFile.get(file).imports.forEach(visit)
      }
      chunks.filter(chunk => chunk.entry).forEach(chunk => visit(chunk.file))
      const report = {
        base: config.base,
        warningLimitBytes: config.build.chunkSizeWarningLimit * 1000,
        catalog: {
          jsonBytes: Buffer.byteLength(JSON.stringify(catalog)),
          photoBytes: Buffer.byteLength(JSON.stringify(catalog.species.flatMap(item => item.observations.flatMap(post => post.photos)))),
          scientificTextBytes: Buffer.byteLength(JSON.stringify(catalog.species.map(item => item.science.searchText))),
          fields: Object.fromEntries(Object.keys(catalog.species[0] || {}).map(key => [key, Buffer.byteLength(JSON.stringify(catalog.species.map(item => item[key])))])),
        },
        initial: {
          files: [...initial].sort(),
          bytes: [...initial].reduce((sum, file) => sum + byFile.get(file).bytes, 0),
          gzipBytes: [...initial].reduce((sum, file) => sum + byFile.get(file).gzipBytes, 0),
        },
        chunks,
      }
      const directory = path.resolve(config.root, config.build.outDir, '.vite')
      await mkdir(directory, { recursive: true })
      await writeFile(path.join(directory, 'bundle-report.json'), JSON.stringify(report, null, 2) + '\n')
    },
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = JSON.parse(await readFile(path.join(root, 'dist/.vite/bundle-report.json'), 'utf8'))
  const kb = bytes => `${(bytes / 1000).toFixed(2)} kB`
  console.info(`Deployment base: ${report.base}`)
  console.info(`Static entry graph: ${kb(report.initial.bytes)} raw / ${kb(report.initial.gzipBytes)} gzip (${report.initial.files.length} files)`)
  console.info(`JavaScript chunks: ${report.chunks.length}; warning budget: ${kb(report.warningLimitBytes)}`)
  console.info(`Catalog JSON: ${kb(report.catalog.jsonBytes)}; photos: ${kb(report.catalog.photoBytes)}; scientific search text: ${kb(report.catalog.scientificTextBytes)}`)
  for (const [field, bytes] of Object.entries(report.catalog.fields).sort((a, b) => b[1] - a[1])) console.info(`  Catalog ${field}: ${kb(bytes)}`)
  for (const chunk of report.chunks.slice(0, 8)) {
    console.info(`${chunk.file}: ${kb(chunk.bytes)} raw / ${kb(chunk.gzipBytes)} gzip${chunk.entry ? ' [entry]' : ''}`)
    for (const module of chunk.modules.slice(0, 3)) console.info(`  ${module.id}: ${kb(module.renderedBytes)} rendered`)
  }
  const oversized = report.chunks.filter(chunk => chunk.bytes > report.warningLimitBytes)
  console.info(`Chunks over budget: ${oversized.length}`)
  if (oversized.length) process.exitCode = 1
}
