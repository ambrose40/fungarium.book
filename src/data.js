import content from './data/index.json'
export const species = content.species
export const metadata = content.metadata
export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return value ? new Intl.DateTimeFormat('en-GB', options).format(new Date(value + 'T12:00:00')) : 'Date not recorded'
}
