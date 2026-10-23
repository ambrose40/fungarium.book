import { readFileSync } from 'node:fs'

export function googleMapsApiKey({ environment = {}, keyFile = new URL('../secrets/maps-api.key', import.meta.url) } = {}) {
  // An explicitly empty environment value disables maps, even when a key file exists.
  if (Object.hasOwn(environment, 'GOOGLE_MAPS_API_KEY')) return String(environment.GOOGLE_MAPS_API_KEY).trim()
  try {
    return readFileSync(keyFile, 'utf8').trim()
  } catch (error) {
    if (error.code === 'ENOENT') return ''
    throw error
  }
}
