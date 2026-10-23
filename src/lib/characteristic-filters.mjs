import { getMycologicalCharacteristics } from './mycology.mjs'

export const CHARACTERISTIC_GROUPS = [
  { id: 'body', title: 'Fruiting form' },
  { id: 'cap', title: 'Cap shape' },
  { id: 'surface', title: 'Cap surface' },
  { id: 'hymenium', title: 'Hymenium' },
  { id: 'attachment', title: 'Hymenium attachment' },
  { id: 'stipe', title: 'Stipe' },
  { id: 'veil', title: 'Veil & stipe features' },
  { id: 'spore-print', title: 'Spore print / mass colour' },
  { id: 'ecology', title: 'Ecology' },
  { id: 'edibility', title: 'Edibility' },
  { id: 'flesh', title: 'Flesh reaction' },
  { id: 'microscopy', title: 'Spore morphology' },
]

const prefix = 'mc.'
const unrecorded = { value: 'unrecorded', label: 'Unspecified / unclassified', icon: 'unknown' }
const canonicalLabels = {
  'hymenium:ridges': 'Ridges / folds / false gills',
  'edibility:edible': 'Edible',
  'edibility:poisonous': 'Poisonous (including raw)',
  'microscopy:warted': 'Rough / warted / ornamented',
}

function filterOptions(science) {
  const characteristics = new Map(getMycologicalCharacteristics(science).map(group => [group.id, group]))
  return CHARACTERISTIC_GROUPS.map(group => {
    const source = characteristics.get(group.id)
    const options = (source?.items || []).map(item => {
      // Explicitly uncertain edibility is not equivalent to an omitted description.
      if (item.id === 'unknown') return group.id === 'edibility' && item.label === 'Edibility uncertain'
        ? { value: 'uncertain', label: 'Edibility uncertain', icon: 'edibility-unknown' }
        : unrecorded
      return {
        value: item.id, label: canonicalLabels[`${group.id}:${item.id}`] || item.label,
        icon: item.icon, ...(item.color ? { color: item.color } : {}),
      }
    })
    return { ...group, options: options.length ? options : [unrecorded] }
  })
}

export function summarizeCharacteristics(science) {
  return Object.fromEntries(filterOptions(science).map(group => [group.id, [...new Set(group.options.map(option => option.value))]]))
}

export function buildCharacteristicFilterIndex(species) {
  const groups = new Map(CHARACTERISTIC_GROUPS.map(group => [group.id, { ...group, options: new Map() }]))
  for (const item of species) {
    for (const group of filterOptions(item.science)) {
      const target = groups.get(group.id)
      for (const option of group.options) {
        if (!target.options.has(option.value)) target.options.set(option.value, { ...option, species: new Set() })
        target.options.get(option.value).species.add(item.id)
      }
    }
  }
  return [...groups.values()].map(group => ({
    id: group.id, title: group.title,
    options: [...group.options.values()].map(({ species: ids, ...option }) => ({ ...option, count: ids.size }))
      .sort((a, b) => Number(a.value === 'unrecorded') - Number(b.value === 'unrecorded') || a.label.localeCompare(b.label)),
  }))
}

export function readCharacteristicSelections(query) {
  const entries = CHARACTERISTIC_GROUPS.flatMap(group => {
    const raw = query[`${prefix}${group.id}`]
    const values = [...new Set((Array.isArray(raw) ? raw : [raw]).filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean))]
    return values.length ? [[group.id, values]] : []
  })
  return Object.fromEntries(entries)
}

export function setCharacteristicSelection(query, id, values) {
  if (!CHARACTERISTIC_GROUPS.some(group => group.id === id)) throw new Error(`Unknown characteristic group: ${id}`)
  const result = { ...query }
  const selected = [...new Set(values.filter(Boolean))].sort()
  if (selected.length) result[`${prefix}${id}`] = selected
  else delete result[`${prefix}${id}`]
  return result
}

export function clearCharacteristicSelections(query) {
  return Object.fromEntries(Object.entries(query).filter(([key]) => !key.startsWith(prefix)))
}

export function matchesCharacteristics(item, selections = {}) {
  return Object.entries(selections).every(([id, selected]) => {
    const values = Array.isArray(selected) ? selected : [selected]
    return !values.length || values.some(value => item.characteristics?.[id]?.includes(value))
  })
}

export function characteristicFacetCounts(species, selections, groups) {
  return Object.fromEntries(groups.map(group => {
    const others = Object.fromEntries(Object.entries(selections).filter(([id]) => id !== group.id))
    const counts = Object.fromEntries(group.options.map(option => [option.value, 0]))
    for (const item of species) {
      if (!matchesCharacteristics(item, others)) continue
      for (const value of new Set(item.characteristics?.[group.id] || [])) {
        if (Object.hasOwn(counts, value)) counts[value]++
      }
    }
    return [group.id, counts]
  }))
}
