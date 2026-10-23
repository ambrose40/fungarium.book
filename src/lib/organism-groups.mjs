export const ORGANISM_GROUPS = [
  { id: 'fungi', label: 'Fungi' },
  { id: 'slime-moulds', label: 'Slime moulds' },
]
const ids = ORGANISM_GROUPS.map(group => group.id)

export function classifyOrganism(taxonomy = [], caption = '') {
  // Older slime-mould captions sometimes use 🍄; their recorded taxonomy takes precedence.
  const classification = taxonomy.join(' ')
  if (/\b(?:Myxogastria|Myxomycetes|Myxomycota|Mycetozoa|Dictyostelia|Dictyosteliomycetes|Protosteliomycetes|Protostelia)\b|slime[ -]mou?lds?/iu.test(classification)) return 'slime-moulds'
  if (/^\s*🦠\s.+\/.+/mu.test(caption)) return 'slime-moulds'
  if (/^\s*🍄\s.+\/.+/mu.test(caption)) return 'fungi'
  return 'unclassified'
}

export function readOrganismSelections(query) {
  const raw = query.organisms
  if (raw === undefined) return [...ids]
  const values = (Array.isArray(raw) ? raw : [raw]).flatMap(value => String(value || '').split(','))
  if (values.includes('none')) return []
  const selected = ids.filter(id => values.includes(id))
  return selected.length ? selected : [...ids]
}

export function setOrganismSelections(query, values) {
  const result = { ...query }
  const selected = ids.filter(id => values.includes(id))
  if (selected.length === ids.length) delete result.organisms
  else result.organisms = selected.length ? selected[0] : 'none'
  return result
}
