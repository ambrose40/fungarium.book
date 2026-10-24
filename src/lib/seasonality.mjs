const seasons = ['Spring', 'Summer', 'Autumn', 'Winter']
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const seasonWord = '(?:spring|summer|autumn|fall|winter)'
const monthWord = `(?:${months.join('|')})`
const periodStart = new RegExp(`^(?:(?:from|in|during|also|occasionally|sometimes|mainly|mostly|often|usually|particularly|throughout|mild|late|early|mid)[ -]+|\\(){0,5}(?:${seasonWord}|${monthWord})\\b`, 'iu')
const fruitingPeriod = new RegExp(`\\b(?:fruits?|fruiting|appears?)\\b[^.;]{0,65}\\b(?:${seasonWord}|${monthWord})\\b`, 'iu')

function segments(text, names, word) {
  const matches = [...text.matchAll(new RegExp(`\\b(${word})\\b`, 'giu'))]
    .filter(match => match[0].toLowerCase() !== 'may' || !/^\s+(?:be|occur|appear|fruit|grow)\b/iu.test(text.slice(match.index + match[0].length)))
  const active = new Set()
  const index = value => names.findIndex(name => name.toLowerCase() === (value.toLowerCase() === 'fall' ? 'autumn' : value.toLowerCase()))
  for (let position = 0; position < matches.length; position++) {
    const match = matches[position]
    const start = index(match[0])
    active.add(start)
    const next = matches[position + 1]
    if (!next) continue
    const between = text.slice(match.index + match[0].length, next.index)
    if (!/^\s*(?:to|through|until|[-–—])\s*(?:(?:early|late|mid)[ -]+)?$/iu.test(between)) continue
    const end = index(next[0])
    for (let step = start; step !== end; step = (step + 1) % names.length) active.add(step)
    active.add(end)
  }
  return names.map((label, position) => ({ id: label.toLowerCase(), label, active: active.has(position) }))
}

export function recordedSeasonality(science) {
  const records = []
  for (const row of science?.traits || []) {
    const explicit = /^(?:fruiting (?:period|season)|phenology|season(?:ality)?)$/iu.test(row.label)
    const ecological = /^(?:ecology|habitat|description)$/iu.test(row.label)
    const overview = /^overview$/iu.test(row.label) && /\b(?:fruit(?:s|ing)?|appears?|found)\b/iu.test(row.text)
    if (!explicit && !ecological && !overview) continue
    // Spore release, infection cycles, and overwintering do not establish a fruiting period.
    if (!explicit && /\b(?:ascospores?|conidia|uredinia|telia|overwinters?|overwintered)\b/iu.test(row.text) && !/\bfruit(?:s|ing)\b/iu.test(row.text)) continue
    let clauses = row.text.split(/[;,]/u).map(text => text.trim())
      .filter(text => explicit || periodStart.test(text) || fruitingPeriod.test(text) || /\b(?:year[- ]round|throughout the year|all year)\b/iu.test(text))
    if (overview) clauses = clauses.filter(text => /\b(?:fruits?|fruiting|appears?|found)\b/iu.test(text))
    for (const text of clauses) {
      if (/\b(?:not|no|outside|except)\b/iu.test(text)) continue
      const yearRound = /\b(?:year[- ]round|throughout the year|all year)\b/iu.test(text)
      const monthly = segments(text, months, monthWord)
      const seasonal = segments(text, seasons, seasonWord)
      const kind = monthly.some(segment => segment.active) ? 'months' : 'seasons'
      const parts = kind === 'months' ? monthly : seasonal
      if (yearRound) parts.forEach(segment => { segment.active = true })
      if (!parts.some(segment => segment.active)) continue
      records.push({ text, kind, segments: parts, scope: yearRound && !/\bfruit(?:s|ing)\b/iu.test(text) ? 'Year-round presence / persistence' : 'Recorded season', evidence: { label: row.label, text: row.text } })
    }
  }
  if (!records.length) return null
  // Use one scale per graphic and retain every supporting source row below it.
  const kind = records.some(record => record.kind === 'months') ? 'months' : 'seasons'
  const selected = records.filter(record => record.kind === kind)
  const parts = selected[0].segments.map((segment, position) => ({ ...segment, active: selected.some(record => record.segments[position].active) }))
  return {
    kind, segments: parts,
    label: parts.filter(segment => segment.active).map(segment => segment.label).join(' · '),
    scope: selected.some(record => record.scope.startsWith('Year-round')) ? 'Year-round presence / persistence' : 'Recorded season',
    evidence: [...new Map(selected.map(record => [`${record.evidence.label}\n${record.evidence.text}`, record.evidence])).values()],
  }
}
