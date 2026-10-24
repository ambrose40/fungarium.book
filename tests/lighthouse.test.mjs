import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregateRuns, auditOptions, categories, median, redactReport, resultSummary } from '../scripts/lighthouse/helpers.mjs'

test('Lighthouse options reject unsafe, unknown, empty and repeated inputs', () => {
  assert.deepEqual(auditOptions(['--label=review', '--runs=3', '--pages=boletus,gallery', '--devices=desktop']).pages.map(page => page.id), ['gallery', 'boletus'])
  assert.equal(auditOptions([]).pages.length, 4)
  for (const argument of ['--label=../other', '--runs=0', '--runs=6', '--runs=1.5', '--devices=phone', '--devices=mobile,', '--pages=gallery,unknown', '--pages=', '--unknown=value']) assert.throws(() => auditOptions([argument]))
  assert.throws(() => auditOptions(['--label=a', '--label=b']))
})

test('saved reports redact literal and URL-encoded credentials without mutating audit data', () => {
  const original = { url: 'https://example.org/?key=private+key', nested: [{ value: 'private%2Bkey' }], score: 1 }
  assert.deepEqual(redactReport(original, ['', 'private+key']), { url: 'https://example.org/?key=[REDACTED]', nested: [{ value: '[REDACTED]' }], score: 1 })
  assert.equal(original.nested[0].value, 'private%2Bkey')
})

test('audit summaries preserve deliberate noindex findings and reject incomplete categories', () => {
  const lhr = {
    categories: Object.fromEntries(categories.map(id => [id, { score: id === 'seo' ? .66 : 1 }])),
    audits: { 'is-crawlable': { id: 'is-crawlable', title: 'Page is blocked from indexing', score: 0 }, manual: { score: null }, passed: { score: 1 }, 'largest-contentful-paint': { score: .8, numericValue: 3100 } },
  }
  const summary = resultSummary(lhr)
  assert.equal(summary.scores.seo, 66)
  assert.equal(summary.metrics['largest-contentful-paint'], 3100)
  assert.equal(summary.metrics['cumulative-layout-shift'], null)
  assert.ok(summary.findings.some(finding => finding.id === 'is-crawlable'))
  assert.equal(summary.findings.length, 2)
  assert.throws(() => resultSummary({ ...lhr, categories: { performance: { score: null } } }), /Incomplete/)
})

test('repeated audit medians group pages and devices independently and ignore absent metrics', () => {
  assert.equal(median([3, null, 1, NaN, 2]), 2)
  assert.equal(median([4, 2]), 3)
  assert.equal(median([null, Infinity]), null)
  const run = (page, device, score, lcp) => ({ page, device, url: `https://example.org/${page}`, scores: Object.fromEntries(categories.map(id => [id, score])), metrics: { lcp, cls: null }, report: `${page}-${device}-${score}.html` })
  const groups = aggregateRuns([run('gallery', 'mobile', 60, 7000), run('gallery', 'mobile', 80, 5000), run('gallery', 'desktop', 100, 900), run('profile', 'mobile', 90, 3000)])
  assert.equal(groups.length, 3)
  assert.equal(groups[0].scores.performance, 70)
  assert.deepEqual(groups[0].metrics, { lcp: 6000, cls: null })
  assert.equal(groups[0].reports.length, 2)
  assert.equal(groups[1].scores.performance, 100)
  assert.deepEqual(aggregateRuns([]), [])
})
