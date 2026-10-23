import { matchesCharacteristics } from './characteristic-filters.mjs'
import { normalizeSearch, scientificText, matchesScientificSearches } from './scientific-search.mjs'
import { ORGANISM_GROUPS } from './organism-groups.mjs'

export { normalizeSearch } from './scientific-search.mjs'

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

export function filterCatalog(species, { search = '', scope = 'all', genus = '', family = '', year = '', letter = '', tag = '', characteristics = {}, scientificSearches = {}, organismGroups = ORGANISM_GROUPS.map(group => group.id) } = {}) {
  const terms = normalizeSearch(search).split(' ').filter(Boolean)
  const allOrganisms = ORGANISM_GROUPS.every(group => organismGroups.includes(group.id))
  return species.filter(item => {
    if (!allOrganisms && !organismGroups.includes(item.organismGroup)) return false
    if (genus && item.genus !== genus) return false
    if (!genus && family && item.family !== family) return false
    if (year && !item.observations.some(post => post.date.startsWith(year))) return false
    if (letter && !item.latinName.startsWith(letter)) return false
    if (tag && !item.hashtags.includes(tag)) return false
    if (!matchesCharacteristics(item, characteristics)) return false
    if (!matchesScientificSearches(item, scientificSearches)) return false
    if (!terms.length) return true

    const descriptions = scientificText(item)
    const category = scope.startsWith('trait:') ? scope.slice('trait:'.length) : ''
    const fields = category ? [Object.hasOwn(descriptions, category) ? descriptions[category] : ''] : [item.latinName, item.identification]
    if (!category && scope !== 'scientific') fields.push(
      item.commonName, item.genus, item.family,
      ...(item.science?.commonNames || []).map(name => name.name),
      ...item.hashtags, ...item.observations.map(post => post.location),
      ...Object.values(descriptions),
    )
    const text = normalizeSearch(fields.filter(Boolean).join(' '))
    return terms.every(term => text.includes(term))
  })
}
