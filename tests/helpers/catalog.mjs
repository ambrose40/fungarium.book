import { readFile } from 'node:fs/promises'
import { assembleCatalog } from '../../src/lib/catalog-data.mjs'

export async function readCatalog() {
  const [index, searchText, filters] = await Promise.all(['index', 'search-index', 'filter-index'].map(async name =>
    JSON.parse(await readFile(new URL(`../../src/data/${name}.json`, import.meta.url), 'utf8'))))
  return assembleCatalog(index, searchText, filters)
}
