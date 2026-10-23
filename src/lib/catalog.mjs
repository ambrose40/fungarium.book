import { matchesCharacteristics } from './characteristic-filters.mjs'

export function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim().replace(/\s+/gu, ' ')
}

export function buildTaxonomyIndex(species) {
  function index(field) {
    const groups = new Map()
    for (const item of species) {
      const name = item[field]?.trim()
      if (!name) continue
      if (!groups.has(name)) groups.set(name, new Set())
      groups.get(name).add(item.id)
    }
    return [...groups].map(([name, ids]) => ({ name, count: ids.size })).sort((a, b) => a.name.localeCompare(b.name))
  }
  return { genera: index('genus'), families: index('family') }
}

export function normalizeTaxonomyQuery(query) {
  const result = { ...query }
  const first = value => Array.isArray(value) ? value[0] : value
  if (first(result.genus) && first(result.family)) delete result.family
  return result
}

export function setTaxonomyFilter(query, field, value) {
  if (field !== 'genus' && field !== 'family') throw new Error('Unknown taxonomic filter.')
  const result = normalizeTaxonomyQuery(query)
  if (value) {
    result[field] = value
    delete result[field === 'genus' ? 'family' : 'genus']
  } else delete result[field]
  return result
}

export function filterCatalog(species, { search = '', scope = 'all', genus = '', family = '', year = '', letter = '', tag = '', characteristics = {} } = {}) {
  const terms = normalizeSearch(search).split(' ').filter(Boolean)
  return species.filter(item => {
    if (genus && item.genus !== genus) return false
    if (!genus && family && item.family !== family) return false
    if (year && !item.observations.some(post => post.date.startsWith(year))) return false
    if (letter && !item.latinName.startsWith(letter)) return false
    if (tag && !item.hashtags.includes(tag)) return false
    if (!matchesCharacteristics(item, characteristics)) return false
    if (!terms.length) return true

    const fields = [item.latinName, item.identification]
    if (scope !== 'scientific') fields.push(
      item.commonName, item.genus, item.family,
      ...(item.science?.commonNames || []).map(name => name.name),
      ...item.hashtags, ...item.observations.map(post => post.location),
    )
    const text = normalizeSearch(fields.filter(Boolean).join(' '))
    return terms.every(term => text.includes(term))
  })
}
