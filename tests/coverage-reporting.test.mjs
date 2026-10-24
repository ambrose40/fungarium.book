import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CoverageReport } from 'monocart-coverage-reports'
import { coverageRoot, inScope, sourcePath, transformUntestedVue } from '../scripts/coverage/config.mjs'
import { runCommand, validateSummary } from '../scripts/coverage/run.mjs'
import { appendGitHubSummary, assertFreshRun, replaceCoverageSnapshot } from '../scripts/coverage/summary.mjs'
import { finalizeCoverage, portableLcov } from '../scripts/coverage/finalize.mjs'
import viteConfig from '../vite.config.js'

test('coverage scope keeps application code and excludes generated data, vendors, and collection infrastructure', () => {
  assert.equal(sourcePath('E:\\workspace\\src\\App.vue?vue&type=script'), 'src/App.vue')
  assert.equal(inScope('../../../src/views/DetailView.vue', 'browser'), true)
  assert.equal(inScope('../../../src/data/posts.json', 'browser'), false)
  assert.equal(inScope('../../../node_modules/vue/src/index.js', 'browser'), false)
  assert.equal(inScope('scripts/build-content.mjs', 'node'), true)
  assert.equal(inScope('scripts/coverage/run.mjs', 'node'), false)
  assert.equal(portableLcov('SF:src\\App.vue\nFN:1,example\n'), 'SF:src/App.vue\nFN:1,example\n')
})

test('missing source files, empty metrics, failed tests, and stale snapshots cannot publish passing coverage', () => {
  const summary = Object.fromEntries(['lines', 'statements', 'branches', 'functions'].map(metric => [metric, { covered: 1, total: 1, pct: 100 }]))
  assert.throws(() => validateSummary(summary, ['src/App.vue'], []), /omitted source/)
  assert.throws(() => validateSummary({ ...summary, branches: { total: 0 } }, [], []), /empty coverage/)
  assert.throws(() => assertFreshRun({ passed: false }, 'same'), /successfully/)
  assert.throws(() => assertFreshRun({ passed: true, exitCode: 0, completedAt: 'now', fingerprint: 'old' }, 'new'), /stale/)
})

test('coverage subprocess execution preserves failing test exit codes', async () => {
  assert.equal(await runCommand(['-e', 'process.exit(23)']), 23)
})

test('coverage maps and test key are isolated from ordinary production output', () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY
  process.env.GOOGLE_MAPS_API_KEY = 'production-key-fixture'
  try {
    const coverage = viteConfig({ mode: 'coverage' })
    const production = viteConfig({ mode: 'production' })
    assert.equal(coverage.build.outDir, 'coverage/browser-build')
    assert.equal(coverage.build.sourcemap, 'hidden')
    assert.equal(coverage.define['import.meta.env.VITE_GOOGLE_MAPS_API_KEY'], '"coverage-maps-test-key"')
    assert.equal(production.build.outDir, 'dist')
    assert.equal(production.build.sourcemap, false)
    assert.equal(production.define['import.meta.env.VITE_GOOGLE_MAPS_API_KEY'], '"production-key-fixture"')
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_MAPS_API_KEY
    else process.env.GOOGLE_MAPS_API_KEY = previous
  }
})

test('coverage snapshot updates preserve surrounding README content and reject ambiguous markers', () => {
  const start = '<!-- coverage-summary:start -->'
  const end = '<!-- coverage-summary:end -->'
  assert.equal(replaceCoverageSnapshot(`before\n${start}\nold\n${end}\nafter`, 'new\n'), `before\n${start}\nnew\n${end}\nafter`)
  for (const invalid of ['no markers', `${end}${start}`, `${start}${start}${end}`, `${start}${end}${end}`]) assert.throws(() => replaceCoverageSnapshot(invalid, 'new'), /marker pair/)
})

test('GitHub job summary output appends coverage without replacing other job information', async () => {
  await mkdir(coverageRoot, { recursive: true })
  const directory = await mkdtemp(path.join(coverageRoot, 'github-summary-test-'))
  try {
    const file = path.join(directory, 'summary.md')
    await writeFile(file, 'Existing job summary\n')
    await appendGitHubSummary('| Scope | Lines |\n| Node | 65% |', file)
    const text = await readFile(file, 'utf8')
    assert.ok(text.startsWith('Existing job summary\n'))
    assert.match(text, /## Fungarium coverage/)
    assert.match(text, /\| Node \| 65% \|/)
    await assert.rejects(appendGitHubSummary('coverage', ''), /GITHUB_STEP_SUMMARY/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('an unexecuted Vue component is mapped back to its source and counted as zero coverage', async () => {
  await mkdir(coverageRoot, { recursive: true })
  const directory = await mkdtemp(path.join(coverageRoot, 'reporting-test-'))
  try {
    const source = path.join(directory, 'src/components/Untested.vue')
    await mkdir(path.dirname(source), { recursive: true })
    await writeFile(source, '<script setup>\nconst message = "unexecuted"\nfunction choose(value) { return value ? message : "other" }\n</script>\n<template><p>{{ choose(true) }}</p></template>\n')
    await writeFile(path.join(path.dirname(source), 'PropsOnly.vue'), '<script setup>\ndefineProps({ size: Number })\n</script>\n<template><svg :width="size"><path d="M0 0h10"/></svg></template>\n')
    await writeFile(path.join(path.dirname(source), 'TemplateOnly.vue'), '<template><p>Never loaded</p></template>\n')
    const outputDir = path.join(directory, 'report')
    const report = new CoverageReport({
      baseDir: directory, outputDir, logging: 'off', sourcePath,
      all: { dir: path.join(directory, 'src'), filter: '**/*.vue', transformer: transformUntestedVue },
      reports: ['json'],
    })
    await report.generate()
    await finalizeCoverage(outputDir, { baseDir: directory, logging: 'off', reports: ['json-summary', 'lcovonly'] }, [])
    assert.ok((await readFile(path.join(outputDir, 'lcov.info'), 'utf8')).includes('SF:src/components/Untested.vue'))
    const summary = JSON.parse(await readFile(path.join(outputDir, 'coverage-summary.json'), 'utf8'))
    const file = Object.keys(summary).find(file => file.endsWith('Untested.vue'))
    assert.ok(file, 'Untested component must be present in the report')
    assert.ok(summary[file].lines.total > 0)
    assert.equal(summary[file].lines.covered, 0)
    assert.equal(summary[file].functions.covered, 0)
    for (const name of ['PropsOnly.vue', 'TemplateOnly.vue']) {
      const entry = Object.keys(summary).find(file => file.endsWith(name))
      assert.ok(entry, `${name} must be present`)
      assert.ok(summary[entry].lines.total > 0)
      assert.equal(summary[entry].lines.covered, 0, `${name} must not gain synthetic covered lines`)
    }
  } finally { await rm(directory, { recursive: true, force: true }) }
})
