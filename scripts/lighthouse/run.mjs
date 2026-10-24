import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import lighthouse, { generateReport } from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { launch } from 'chrome-launcher'
import { loadEnv, preview } from 'vite'
import { root } from '../project-paths.mjs'
import { googleMapsApiKey } from '../maps-config.mjs'
import { aggregateRuns, auditOptions, auditPages, categories, redactReport, resultSummary } from './helpers.mjs'

export async function runLighthouse({ label = 'latest', repeats = 1, devices = ['mobile', 'desktop'], pages = auditPages } = {}) {
  if (!/^[a-z0-9-]+$/u.test(label) || !Number.isInteger(repeats) || repeats < 1 || repeats > 5) throw new Error('Use a safe label and 1–5 repetitions')
  if (!devices.length || devices.some(device => !['mobile', 'desktop'].includes(device))) throw new Error('Device must be mobile or desktop')
  if (!pages.length || pages.some(page => !auditPages.some(known => known.id === page.id && known.path === page.path))) throw new Error('Unknown audit page')
  const environment = loadEnv('production', root, ['GOOGLE_MAPS_', 'SITE_'])
  const secrets = [googleMapsApiKey({ environment })]
  const directory = path.join(root, 'lighthouse-results', label)
  await mkdir(directory, { recursive: true })
  const build = JSON.parse(await readFile(path.join(root, 'dist/.vite/bundle-report.json'), 'utf8'))
  if (build.base !== '/encyclopedia/') throw new Error('Run npm run build:encyclopedia before Lighthouse')
  const metadata = {
    label, startedAt: new Date().toISOString(), node: process.version,
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    buildHtmlHash: createHash('sha256').update(await readFile(path.join(root, 'dist/index.html'))).digest('hex'),
    base: '/encyclopedia/', repeats, devices, pages,
    conditions: 'Local production preview; fresh Chrome profile per run; standard Lighthouse mobile/desktop simulated throttling; normal external requests; credential values redacted in saved reports.',
    runs: [],
  }
  await writeFile(path.join(directory, 'summary.json'), JSON.stringify({ ...metadata, aggregates: [] }, null, 2))
  const server = await preview({ root, base: '/encyclopedia/', preview: { host: '127.0.0.1', port: 4179, strictPort: true } })
  try {
    for (const page of pages) for (const device of devices) for (let run = 1; run <= repeats; run++) {
      const profile = await mkdtemp(path.join(directory, '.chrome-'))
      let chrome
      try {
        chrome = await launch({ chromeFlags: ['--headless=new'], userDataDir: profile, logLevel: 'silent' })
        const url = `http://127.0.0.1:4179/encyclopedia/${page.path}`
        const result = await lighthouse(url, { port: chrome.port, logLevel: 'silent', onlyCategories: categories }, device === 'desktop' ? desktopConfig : undefined)
        if (!result?.lhr) throw new Error(`Lighthouse produced no result: ${page.id}/${device}`)
        const safe = redactReport(result.lhr, secrets)
        const name = `${page.id}-${device}-${run}`
        await writeFile(path.join(directory, `${name}.json`), JSON.stringify(safe, null, 2))
        await writeFile(path.join(directory, `${name}.html`), generateReport(safe, 'html'))
        if (safe.runtimeError) throw new Error(`Lighthouse ${page.id}/${device}: ${safe.runtimeError.code}`)
        metadata.lighthouse = safe.lighthouseVersion
        metadata.userAgent = safe.environment.hostUserAgent
        const row = { page: page.id, device, run, url, report: `${name}.html`, fetchTime: safe.fetchTime, settings: safe.configSettings, warnings: safe.runWarnings, ...resultSummary(safe) }
        metadata.runs.push(row)
        await writeFile(path.join(directory, 'summary.json'), JSON.stringify({ ...metadata, aggregates: aggregateRuns(metadata.runs) }, null, 2))
        console.info(`${label}: ${name} ${JSON.stringify(row.scores)} LCP=${Math.round(row.metrics['largest-contentful-paint'])}ms CLS=${row.metrics['cumulative-layout-shift'].toFixed(3)}`)
      } finally {
        await chrome?.kill()
        await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
      }
    }
    metadata.completedAt = new Date().toISOString()
    await writeFile(path.join(directory, 'summary.json'), JSON.stringify({ ...metadata, aggregates: aggregateRuns(metadata.runs) }, null, 2))
    return metadata
  } finally { await new Promise(resolve => server.httpServer.close(resolve)) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runLighthouse(auditOptions(process.argv.slice(2)))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
