export function assembleCatalog(index, searchText, filters) {
  return {
    metadata: index.metadata,
    characteristicFilters: filters.characteristicFilters,
    scientificSearchFields: filters.scientificSearchFields,
    species: index.species.map(item => ({
      ...item,
      characteristics: filters.characteristics[item.id],
      science: { ...item.science, searchText: { ...item.science.searchText, ...searchText[item.id] } },
    })),
  }
}
