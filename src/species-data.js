import { species } from './data'

const pages = import.meta.glob('./data/species/*.json')
const cache = new Map()
const pending = new Map()
export function cachedSpecies(id) { return cache.get(id) || null }
export async function loadSpecies(id) {
  if (!species.some(item => item.id === id)) return null
  if (cache.has(id)) return cache.get(id)
  const load = pages[`./data/species/${id}.json`]
  if (!load) return null
  if (!pending.has(id)) pending.set(id, load().then(module => { cache.set(id, module.default); return module.default }).finally(() => pending.delete(id)))
  return pending.get(id)
}
