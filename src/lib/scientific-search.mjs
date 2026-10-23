export function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim().replace(/\s+/gu, ' ')
}

const preferredLabels = [
  'Hymenium', 'Cap', 'Hymenium attachment', 'Stipe', 'Spore print', 'Ecology',
  'Edibility', 'Fruit body', 'Dimensions', 'Flesh', 'Chemical reactions', 'Odour',
  'Taste', 'Microscopy', 'Overview',
]
export function scientificFieldId(label) {
  return normalizeSearch(label).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/gu, '')
}
const preferred = new Map(preferredLabels.map((label, order) => [scientificFieldId(label), { label, order }]))
const prefix = 'sc.'

export function summarizeScientificText(science) {
  const fields = new Map()
  for (const trait of science?.traits || []) {
    const id = scientificFieldId(trait.label)
    if (!id || !trait.text?.trim()) continue
    if (!fields.has(id)) fields.set(id, new Set())
    fields.get(id).add(trait.text.trim())
  }
  return Object.fromEntries([...fields].map(([id, texts]) => [id, [...texts].join('\n')]))
}

export function buildScientificSearchFields(species) {
  const fields = new Map()
  for (const item of species) {
    const seen = new Set()
    for (const trait of item.science?.traits || []) {
      const id = scientificFieldId(trait.label)
      if (!id || !trait.text?.trim() || seen.has(id)) continue
      seen.add(id)
      if (!fields.has(id)) fields.set(id, { id, label: preferred.get(id)?.label || trait.label.trim(), count: 0 })
      fields.get(id).count++
    }
  }
  return [...fields.values()].sort((a, b) =>
    (preferred.get(a.id)?.order ?? preferred.size) - (preferred.get(b.id)?.order ?? preferred.size) || a.label.localeCompare(b.label))
}

export function scientificText(item) {
  return item.science?.searchText || summarizeScientificText(item.science)
}

export function matchesSearchText(text, search) {
  const terms = normalizeSearch(search).split(' ').filter(Boolean)
  const normalized = normalizeSearch(text)
  return terms.every(term => normalized.includes(term))
}

export function matchesScientificSearches(item, searches = {}) {
  const fields = scientificText(item)
  return Object.entries(searches).every(([id, search]) => matchesSearchText(Object.hasOwn(fields, id) ? fields[id] : '', search))
}

export function readScientificSearches(query, fields) {
  return Object.fromEntries(fields.flatMap(({ id }) => {
    const raw = query[`${prefix}${id}`]
    const value = Array.isArray(raw) ? raw[0] : raw
    return typeof value === 'string' && value.trim() ? [[id, value]] : []
  }))
}

export function setScientificSearch(query, id, text) {
  const result = { ...query }
  if (text.trim()) result[`${prefix}${id}`] = text
  else delete result[`${prefix}${id}`]
  return result
}

export function clearScientificSearches(query) {
  return Object.fromEntries(Object.entries(query).filter(([key]) => !key.startsWith(prefix)))
}
