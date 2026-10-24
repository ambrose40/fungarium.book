import index from './data/index.json'
import searchText from './data/search-index.json'
import filters from './data/filter-index.json'
import { assembleCatalog } from './lib/catalog-data.mjs'

const content = assembleCatalog(index, searchText, filters)
export const species = content.species
export const characteristicFilters = content.characteristicFilters
export const scientificSearchFields = content.scientificSearchFields
