import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { getMycologicalCharacteristics } from '../src/lib/mycology.mjs'
import { root } from './project-paths.mjs'
import { MYCOLOGY_ART_ICONS } from '../src/lib/mycology-art-index.mjs'

const { species } = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'))
const candidates = {
  reactions: /blacken|deliquesc|\bink\b|blu(?:e|ing)|guttat|latex|exud|\bjuice\b|droplets?/iu,
  dyes: /\bdy(?:e|es|eing|estuff)\b/iu,
  fruiting: /fruiting period|phenology|season|\b(?:spring|summer|autumn|winter|january|february|march|april|june|july|august|september|october|november|december)\b/iu,
}
const coverage = {}
for (const item of species) for (const category of getMycologicalCharacteristics(item.science)) {
  const known = category.items.filter(value => value.id !== 'unknown')
  if (known.length || category.timeline) coverage[category.id] = (coverage[category.id] || 0) + 1
}
const records = Object.fromEntries(Object.entries(candidates).map(([name, pattern]) => [name,
  species.flatMap(item => {
    const rows = item.science.traits.filter(row => pattern.test(`${row.label} ${row.text}`))
    return rows.length ? [{ id: item.id, rows: rows.map(({ label, text }) => ({ label, text })) }] : []
  }),
]))
let comparison
if (process.argv.includes('--compare-head')) {
  const previous = JSON.parse(execFileSync('git', ['show', 'HEAD:src/data/posts.json'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }))
  const omitDerived = items => items.map(({ characteristics, ...item }) => item)
  comparison = {
    sourceRecordsUnchanged: JSON.stringify(omitDerived(previous.species)) === JSON.stringify(omitDerived(species)),
    changedCharacteristicKeys: species.filter(item => JSON.stringify(item.characteristics) !== JSON.stringify(previous.species.find(record => record.id === item.id)?.characteristics)).map(item => item.id),
  }
  if (!comparison.sourceRecordsUnchanged) process.exitCode = 1
}
const artwork = { count: MYCOLOGY_ART_ICONS.length, bytes: 0, missing: [] }
for (const icon of MYCOLOGY_ART_ICONS) {
  try { artwork.bytes += (await readFile(path.join(root, 'public/illustrations/mycology', `${icon}.webp`))).byteLength }
  catch (error) { if (error.code !== 'ENOENT') throw error; artwork.missing.push(icon) }
}
if (artwork.missing.length) process.exitCode = 1
console.info(JSON.stringify({ species: species.length, coverage, artwork, candidates: Object.fromEntries(Object.entries(records).map(([name, items]) => [name, items.length])), ...(comparison ? { comparison } : {}), ...(process.argv.includes('--details') ? { records } : {}) }, null, 2))
