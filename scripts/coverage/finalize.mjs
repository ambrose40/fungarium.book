import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CoverageReport } from 'monocart-coverage-reports'
import { coverageOptions, sourcePath } from './config.mjs'

export function portableLcov(text) {
  return text.replace(/^SF:(.+)$/gmu, (line, file) => `SF:${sourcePath(file)}`)
}

export async function finalizeCoverage(outputDir, options, observedSources) {
  const coverage = JSON.parse(await readFile(path.join(outputDir, 'coverage-final.json'), 'utf8'))
  const observed = new Set([...observedSources].map(sourcePath))
  for (const [file, data] of Object.entries(coverage)) {
    if (observed.has(sourcePath(file))) continue
    // A compiler-erased macro-only SFC can acquire a synthetic covered statement
    // during V8 remapping. A file never observed by collection must stay at zero.
    for (const key of Object.keys(data.s)) data.s[key] = 0
    for (const key of Object.keys(data.f)) data.f[key] = 0
    for (const key of Object.keys(data.b)) data.b[key] = data.b[key].map(() => 0)
  }
  const report = new CoverageReport({ ...options, outputDir, all: undefined })
  await report.cleanCache()
  await report.add(coverage)
  const result = await report.generate()
  if (!result) throw new Error('Mapped coverage report was empty')
  const hasReport = name => options.reports.some(report => (Array.isArray(report) ? report[0] : report) === name)
  if (hasReport('lcovonly')) {
    const file = path.join(outputDir, 'lcov.info')
    await writeFile(file, portableLcov(await readFile(file, 'utf8')))
  }
  if (hasReport('cobertura')) {
    const file = path.join(outputDir, 'cobertura-coverage.xml')
    const xml = await readFile(file, 'utf8')
    await writeFile(file, xml.replace(/filename="([^"]+)"/gu, (attribute, file) => `filename="${file.replaceAll('\\', '/')}"`))
  }
  return result
}

export function finalizeScope(kind, observedSources) {
  const options = coverageOptions(kind)
  return finalizeCoverage(options.outputDir, options, observedSources)
}
