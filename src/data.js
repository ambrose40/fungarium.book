import content from './data/index.json'
export const species = content.species
export const metadata = content.metadata
export const characteristicFilters = content.characteristicFilters || []
const pages = import.meta.glob('./data/species/*.json')
export async function loadSpecies(id) {
  if (!species.some(item => item.id === id)) return null
  const load = pages[`./data/species/${id}.json`]
  return load ? (await load()).default : null
}
export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return value ? new Intl.DateTimeFormat('en-GB', options).format(new Date(value + 'T12:00:00')) : 'Date not recorded'
}
