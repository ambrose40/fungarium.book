export const auditPages = [
  { id: 'gallery', path: '' },
  { id: 'filtered', path: '?genus=Boletus&mc.hymenium=pores' },
  { id: 'boletus', path: 'fungi/boletus-edulis/' },
  { id: 'amanita', path: 'fungi/amanita-muscaria/' },
]
export const categories = ['performance', 'accessibility', 'best-practices', 'seo']

export function auditOptions(arguments_) {
  const options = {}
  for (const argument of arguments_) {
    const match = argument.match(/^--(label|runs|pages|devices)=(.+)$/u)
    if (!match || Object.hasOwn(options, match[1])) throw new Error(`Invalid or repeated audit option: ${argument}`)
    options[match[1]] = match[2]
  }
  const label = options.label || 'latest'
  const repeats = Number(options.runs || 1)
  if (!/^[a-z0-9-]+$/u.test(label) || !Number.isInteger(repeats) || repeats < 1 || repeats > 5) throw new Error('Use a safe label and 1–5 repetitions')
  const devices = [...new Set((options.devices || 'mobile,desktop').split(','))]
  if (devices.some(device => !['mobile', 'desktop'].includes(device))) throw new Error('Device must be mobile or desktop')
  const ids = (options.pages || auditPages.map(page => page.id).join(',')).split(',')
  if (ids.some(id => !auditPages.some(page => page.id === id))) throw new Error('Unknown audit page; use gallery,filtered,boletus,amanita')
  return { label, repeats, devices, pages: auditPages.filter(page => ids.includes(page.id)) }
}

export function redactReport(value, secrets) {
  let text = JSON.stringify(value)
  for (const secret of secrets.filter(Boolean)) {
    text = text.replaceAll(secret, '[REDACTED]').replaceAll(encodeURIComponent(secret), '[REDACTED]')
  }
  return JSON.parse(text)
}

export function resultSummary(lhr) {
  if (categories.some(id => !Number.isFinite(lhr.categories[id]?.score))) throw new Error('Incomplete Lighthouse category scores')
  return {
    scores: Object.fromEntries(categories.map(id => [id, Math.round(lhr.categories[id].score * 100)])),
    metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'total-byte-weight'].map(id => [id, lhr.audits[id]?.numericValue ?? null])),
    findings: Object.values(lhr.audits).filter(audit => audit.score !== null && audit.score < 1)
      .map(({ id, title, score, displayValue }) => ({ id, title, score, displayValue })),
  }
}

export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function aggregateRuns(runs) {
  return Object.values(Object.groupBy(runs, run => `${run.page}-${run.device}`)).map(group => ({
    page: group[0].page, device: group[0].device, url: group[0].url, runs: group.length,
    scores: Object.fromEntries(categories.map(id => [id, median(group.map(run => run.scores[id]))])),
    metrics: Object.fromEntries(Object.keys(group[0].metrics).map(id => [id, median(group.map(run => run.metrics[id]))])),
    reports: group.map(run => run.report),
  }))
}
