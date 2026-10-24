import { spawn, execFileSync } from 'node:child_process'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { CoverageReport } from 'monocart-coverage-reports'
import { build } from 'vite'
import { root } from '../project-paths.mjs'
import { coverageOptions, coverageRoot, metrics, sourcePath } from './config.mjs'
import { expectedSources, inputFingerprint } from './files.mjs'
import { finalizeScope } from './finalize.mjs'

const require = createRequire(import.meta.url)
export function runCommand(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
  })
}

export function validateSummary(summary, expected, fileNames) {
  for (const metric of metrics) {
    const value = summary?.[metric]
    if (!value || !(value.total > 0) || !Number.isFinite(value.pct)) throw new Error(`Missing/empty coverage metric: ${metric}`)
  }
  const reported = new Set(fileNames.map(sourcePath))
  const missing = expected.map(sourcePath).filter(file => !reported.has(file))
  if (missing.length) throw new Error(`Coverage omitted source files: ${missing.join(', ')}`)
}

export async function runCoverage(kind) {
  if (!['node', 'browser'].includes(kind)) throw new Error(`Unknown coverage scope: ${kind}`)
  const output = path.join(coverageRoot, kind)
  for (const file of ['summary.md', 'gaps.md']) await rm(path.join(coverageRoot, file), { force: true })
  await rm(output, { recursive: true, force: true })
  await mkdir(output, { recursive: true })
  let fingerprint = await inputFingerprint()
  const startedAt = new Date().toISOString()
  const run = { scope: kind, startedAt, fingerprint, node: process.version, revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), passed: false }
  await writeFile(path.join(output, 'run.json'), JSON.stringify(run, null, 2))
  let exitCode
  const report = new CoverageReport({ ...coverageOptions(kind), reports: ['json'] })
  const observedSources = new Set()
  if (kind === 'node') {
    const raw = path.join(output, 'raw')
    await mkdir(raw, { recursive: true })
    exitCode = await runCommand(['--test', 'tests/*.test.mjs'], { NODE_V8_COVERAGE: raw })
    if (!(await readdir(raw)).some(file => file.endsWith('.json'))) throw new Error('Node did not produce raw coverage')
    for (const file of await readdir(raw)) {
      if (!file.endsWith('.json')) continue
      const data = JSON.parse(await readFile(path.join(raw, file), 'utf8'))
      for (const entry of data.result || []) if (entry.url.startsWith('file:') && entry.functions.some(fn => fn.ranges.some(range => range.count > 0))) observedSources.add(sourcePath(entry.url))
    }
    await report.addFromDir(raw)
  } else {
    await rm(path.join(coverageRoot, 'browser-samples'), { recursive: true, force: true })
    await runCommand(['scripts/build-content.mjs']).then(code => { if (code) throw new Error('Content generation failed') })
    fingerprint = await inputFingerprint()
    run.fingerprint = fingerprint
    await writeFile(path.join(output, 'run.json'), JSON.stringify(run, null, 2))
    await build({ root, mode: 'coverage', logLevel: 'warn' })
    exitCode = await runCommand([require.resolve('@playwright/test/cli'), 'test', '--config=playwright.coverage.config.js'])
    const samples = await readdir(path.join(coverageRoot, 'browser-samples'))
    if (!samples.length) throw new Error('Browser tests did not produce coverage samples')
    run.samples = samples.length
    const details = await Promise.all(samples.map(async file => JSON.parse(await readFile(path.join(coverageRoot, 'browser-samples', file), 'utf8'))))
    run.chromium = [...new Set(details.map(sample => sample.chromium))]
    for (const sample of details) for (const source of sample.sources) observedSources.add(source)
  }
  const result = await report.generate()
  if (!result) throw new Error(`No ${kind} coverage result`)
  await finalizeScope(kind, observedSources)
  const summary = JSON.parse(await readFile(path.join(output, 'coverage-summary.json'), 'utf8'))
  validateSummary(summary.total, await expectedSources(kind), Object.keys(summary).filter(file => file !== 'total'))
  if (await inputFingerprint() !== fingerprint) throw new Error('Coverage inputs changed during the run; rerun coverage')
  run.completedAt = new Date().toISOString()
  run.exitCode = exitCode
  run.passed = exitCode === 0
  await writeFile(path.join(output, 'run.json'), JSON.stringify(run, null, 2) + '\n')
  console.info(`\n${kind} coverage (${run.passed ? 'tests passed' : 'tests failed'}):`)
  for (const metric of metrics) console.info(`  ${metric}: ${summary.total[metric].pct}%`)
  if (exitCode) throw new Error(`${kind} tests failed (exit ${exitCode}); reports are diagnostic only`)
  return run
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const kind = process.argv[2] || 'all'
    if (kind === 'all') {
      const generated = await runCommand(['scripts/build-content.mjs'])
      if (generated) throw new Error('Content generation failed')
      for (const scope of ['node', 'browser']) await runCoverage(scope)
      const { writeSummary } = await import('./summary.mjs')
      await writeSummary({ github: Boolean(process.env.GITHUB_STEP_SUMMARY) })
    } else await runCoverage(kind)
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
