import { species } from './data'

const pages = import.meta.glob('./data/species/*.json')
export async function loadSpecies(id) {
  if (!species.some(item => item.id === id)) return null
  const load = pages[`./data/species/${id}.json`]
  return load ? (await load()).default : null
}
