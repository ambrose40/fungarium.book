import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { CoverageReport } from 'monocart-coverage-reports'
import { browserBuild, coverageOptions, coverageRoot, inScope, sourcePath } from './config.mjs'

export async function collectBrowserCoverage(entries, chromium, testInfo) {
  const application = []
  const sources = new Set()
  for (const entry of entries) {
    const url = new URL(entry.url, testInfo.project.use.baseURL)
    if (url.origin !== testInfo.project.use.baseURL || !/^\/assets\/[^/]+\.js$/u.test(url.pathname)) continue
    const file = path.join(browserBuild, 'assets', path.basename(url.pathname))
    const sourceMap = JSON.parse(await readFile(`${file}.map`, 'utf8'))
    if (!sourceMap.sources.some(source => inScope(source, 'browser'))) continue
    for (const source of sourceMap.sources) if (inScope(source, 'browser')) sources.add(sourcePath(source))
    application.push({ ...entry, sourceMap })
  }
  if (!application.length) return // API-only and no-JavaScript tests have no script coverage.
  await new CoverageReport(coverageOptions('browser')).add(application)
  const directory = path.join(coverageRoot, 'browser-samples')
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, `${randomUUID()}.json`), JSON.stringify({ chromium, test: testInfo.title, entries: application.length, sources: [...sources] }))
}
