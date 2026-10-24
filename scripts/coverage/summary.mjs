import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { root } from '../project-paths.mjs'
import { coverageRoot, metrics } from './config.mjs'
import { inputFingerprint } from './files.mjs'

export function replaceCoverageSnapshot(text, markdown) {
  const start = '<!-- coverage-summary:start -->'
  const end = '<!-- coverage-summary:end -->'
  const first = text.indexOf(start)
  const last = text.indexOf(end)
  if (first < 0 || last < first || text.indexOf(start, first + 1) >= 0 || text.indexOf(end, last + 1) >= 0) throw new Error('README requires one ordered coverage snapshot marker pair')
  return text.slice(0, first) + `${start}\n${markdown}${end}` + text.slice(last + end.length)
}

export async function appendGitHubSummary(markdown, file = process.env.GITHUB_STEP_SUMMARY) {
  if (!file) throw new Error('GITHUB_STEP_SUMMARY is not set')
  await appendFile(file, `## Fungarium coverage\n\n${markdown}\n`)
}

export function assertFreshRun(run, fingerprint) {
  if (!run?.passed || run.exitCode !== 0 || !run.completedAt) throw new Error('Coverage run did not finish successfully')
  if (run.fingerprint !== fingerprint) throw new Error('Coverage is stale: source/tests/configuration changed; rerun npm run coverage')
}

function badge(label, percentage) {
  const colour = percentage >= 80 ? '#287d3c' : percentage >= 60 ? '#956900' : '#a33b2c'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="224" height="24" role="img" aria-label="${label}: ${percentage.toFixed(2)}%"><rect width="150" height="24" fill="#343434"/><rect x="150" width="74" height="24" fill="${colour}"/><g fill="#fff" font-family="Verdana,sans-serif" font-size="11" text-anchor="middle"><text x="75" y="16">${label}</text><text x="187" y="16">${percentage.toFixed(2)}%</text></g></svg>\n`
}

export async function writeSummary({ updateReadme = false, github = false } = {}) {
  const fingerprint = await inputFingerprint()
  const scopes = []
  for (const kind of ['node', 'browser']) {
    const directory = path.join(coverageRoot, kind)
    const run = JSON.parse(await readFile(path.join(directory, 'run.json'), 'utf8'))
    assertFreshRun(run, fingerprint)
    const summary = JSON.parse(await readFile(path.join(directory, 'coverage-summary.json'), 'utf8'))
    for (const metric of metrics) if (!(summary.total?.[metric]?.total > 0) || !Number.isFinite(summary.total[metric].pct)) throw new Error(`Invalid ${kind} ${metric} coverage`)
    scopes.push({ kind, run, summary })
  }
  const rows = scopes.map(({ kind, summary }) => `| ${kind === 'node' ? 'Node utilities / scripts' : 'Browser application / Vue'} | ${metrics.map(metric => `${summary.total[metric].pct.toFixed(2)}%`).join(' | ')} | ${Object.keys(summary).length - 1} |`)
  const measured = scopes.map(scope => scope.run.completedAt).sort().at(-1)
  const markdown = [
    '| Scope | Lines | Statements | Functions | Branches | Files |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
    `Measured ${measured.slice(0, 10)} with Node ${scopes[0].run.node}; Chrome ${scopes[1].run.chromium.join(', ')}. Source fingerprint: \`${fingerprint.slice(0, 12)}\`.`,
    '',
    'The scopes are separate measurements with overlapping shared utilities; percentages are not combined. Untested in-scope files count as zero. Regenerate this snapshot after code or test changes.',
  ].join('\n') + '\n'
  await writeFile(path.join(coverageRoot, 'summary.md'), `# Coverage snapshot\n\n${markdown}`)
  const gaps = scopes.map(({ kind, summary }) => {
    const files = Object.entries(summary).filter(([file]) => file !== 'total')
      .map(([file, value]) => ({ file, missed: value.lines.total - value.lines.covered, ...value }))
      .filter(file => file.missed > 0).sort((a, b) => b.missed - a.missed).slice(0, 5)
    return `## ${kind}\n\n| File | Uncovered mapped lines | Lines | Branches |\n| --- | ---: | ---: | ---: |\n` + files.map(file => `| ${file.file} | ${file.missed} | ${file.lines.pct}% | ${file.branches.pct}% |`).join('\n')
  }).join('\n\n')
  await writeFile(path.join(coverageRoot, 'gaps.md'), `# Coverage follow-up candidates\n\n${gaps}\n`)
  if (github) await appendGitHubSummary(markdown)
  if (updateReadme) {
    const file = path.join(root, 'README.md')
    const text = await readFile(file, 'utf8')
    await writeFile(file, replaceCoverageSnapshot(text, markdown))
    const directory = path.join(root, 'docs/coverage')
    await mkdir(directory, { recursive: true })
    for (const { kind, summary } of scopes) await writeFile(path.join(directory, `${kind}-lines.svg`), badge(`${kind} lines`, summary.total.lines.pct))
  }
  console.info(markdown)
  return markdown
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await writeSummary({ updateReadme: process.argv.includes('--update-readme'), github: process.argv.includes('--github') }) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
