<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, ArrowRight, ChevronDown, Search, SlidersHorizontal, X, Leaf, Camera, BookOpen } from 'lucide-vue-next'
import { species, metadata, characteristicFilters } from '../data'
import MediaFrame from '../components/MediaFrame.vue'
import TaxonomyFilter from '../components/TaxonomyFilter.vue'
import CharacteristicFilters from '../components/CharacteristicFilters.vue'
import TopNineSlideshow from '../components/TopNineSlideshow.vue'
import { SITE_NAME } from '../branding'
import { buildTaxonomyIndex, filterCatalog, normalizeTaxonomyQuery, setTaxonomyFilter } from '../lib/catalog.mjs'
import { readCharacteristicSelections, setCharacteristicSelection, clearCharacteristicSelections, characteristicFacetCounts } from '../lib/characteristic-filters.mjs'

const route = useRoute()
const router = useRouter()
document.title = SITE_NAME
async function explore() {
  await nextTick()
  const photos = document.getElementById('collection-photos')
  photos?.focus({ preventScroll: true })
  photos?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
const filtersOpen = ref(false)
const canonicalQuery = computed(() => normalizeTaxonomyQuery(route.query))
watch(() => route.query, query => {
  if (query.genus && query.family) router.replace({ query: normalizeTaxonomyQuery(query) })
}, { immediate: true })
// URL-backed models keep native links, back/forward, and the form in sync.
function queryModel(key, fallback = '') {
  return computed({
    get: () => {
      const value = canonicalQuery.value[key]
      return String((Array.isArray(value) ? value[0] : value) || fallback)
    },
    set: value => router.replace({ query: ['genus', 'family'].includes(key)
      ? setTaxonomyFilter(canonicalQuery.value, key, value)
      : { ...canonicalQuery.value, [key]: value && value !== fallback ? value : undefined } }),
  })
}
const search = queryModel('q')
const scope = queryModel('scope', 'all')
const genus = queryModel('genus')
const family = queryModel('family')
const year = queryModel('year')
const sort = queryModel('sort', 'name')
const letter = queryModel('letter')
const limit = ref(36)
const resetVersion = ref(0)
const tag = queryModel('tag')
const taxonomy = buildTaxonomyIndex(species)
const families = taxonomy.families.map(item => item.name)
const years = [...new Set(species.flatMap(item => item.observations.map(post => post.date.slice(0, 4))))].sort().reverse()
const letters = [...new Set(species.map(item => item.latinName[0]))].sort()
const characteristics = computed(() => readCharacteristicSelections(canonicalQuery.value))
const baseFilters = computed(() => ({ search: search.value, scope: scope.value, genus: genus.value, family: family.value, year: year.value, letter: letter.value, tag: tag.value }))
const taxonomyFiltered = computed(() => filterCatalog(species, baseFilters.value))
const characteristicCounts = computed(() => characteristicFacetCounts(taxonomyFiltered.value, characteristics.value, characteristicFilters))
const activeCharacteristics = computed(() => characteristicFilters.flatMap(group =>
  (characteristics.value[group.id] || []).map(value => ({
    group: group.id, title: group.title, value,
    label: group.options.find(option => option.value === value)?.label || value,
  })),
))
const filtered = computed(() => {
  const result = filterCatalog(taxonomyFiltered.value, { characteristics: characteristics.value })
  return result.sort((a, b) => sort.value === 'newest' ? b.latestDate.localeCompare(a.latestDate) || a.latinName.localeCompare(b.latinName) : sort.value === 'observations' ? b.observations.length - a.observations.length || a.latinName.localeCompare(b.latinName) : a.latinName.localeCompare(b.latinName))
})
const visible = computed(() => filtered.value.slice(0, limit.value))
const hasFilters = computed(() => search.value || scope.value !== 'all' || genus.value || family.value || year.value || letter.value || tag.value || activeCharacteristics.value.length)
const filterCount = computed(() => [genus.value, family.value, year.value, letter.value, tag.value].filter(Boolean).length + activeCharacteristics.value.length)
watch(() => route.fullPath, () => { limit.value = 36 })
function reset() { resetVersion.value++; router.replace({ query: {} }) }
function clearTaxonomy() {
  const query = { ...canonicalQuery.value }
  delete query.genus
  delete query.family
  router.replace({ query })
}
function changeCharacteristic(id, values) { router.replace({ query: setCharacteristicSelection(canonicalQuery.value, id, values) }) }
function clearCharacteristics() { router.replace({ query: clearCharacteristicSelections(canonicalQuery.value) }) }
function removeCharacteristic(id, value) { changeCharacteristic(id, characteristics.value[id].filter(item => item !== value)) }
function familyLink(name) { return { name: 'gallery', query: setTaxonomyFilter(canonicalQuery.value, 'family', name) } }
function cover(item) { return item.observations.find(post => post.photos.length)?.photos[0] }
</script>

<template>
  <div class="container">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="status-dot"></span> A PHOTOGRAPHIC ENCYCLOPEDIA OF FUNGI</p>
        <h1 id="hero-title">A closer look at<br />the <em>fungal world.</em></h1>
        <p class="hero-description">Small wonders, carefully observed. A growing collection of fungi, field notes, and macro photography — one woodland encounter at a time.</p>
        <a class="hero-explore" href="#collection-photos" @click.prevent="explore">Explore the collection <ArrowDown :size="17" /></a>
        <div class="hero-stats">
          <div><strong>{{ metadata.speciesCount }}</strong><span><Leaf :size="13" /> species & taxa</span></div>
          <div><strong>{{ metadata.postCount }}</strong><span><BookOpen :size="13" /> field encounters</span></div>
          <div><strong>{{ years.at(-1) }}–{{ years[0]?.slice(2) }}</strong><span><Camera :size="13" /> years of curiosity</span></div>
        </div>
      </div>
      <TopNineSlideshow />
    </section>

    <section id="collection" class="collection" aria-labelledby="collection-title">
      <div class="section-heading"><div><p class="eyebrow">THE LIVING INDEX</p><h2 id="collection-title">The collection<span class="count">{{ metadata.speciesCount }}</span></h2></div><p>Every species has a story.<br /><span>Find one that catches your eye.</span></p></div>
      <div class="filter-bar">
        <div class="search-input">
          <Search :size="18" />
          <label class="sr-only" for="species-search">Search fungi by scientific name or other fields</label>
          <input id="species-search" v-model="search" type="search" placeholder="Search scientific names, e.g. Boletus edulis…" />
          <label class="sr-only" for="search-scope">Search scope</label>
          <select id="search-scope" v-model="scope" class="search-scope"><option value="all">All fields</option><option value="scientific">Scientific name</option></select>
        </div>
        <button class="filter-toggle" type="button" :aria-expanded="filtersOpen" aria-controls="collection-filters" @click="filtersOpen = !filtersOpen"><SlidersHorizontal :size="16" aria-hidden="true" /> Filters <span v-if="filterCount" class="count">{{ filterCount }}</span><ChevronDown :size="15" aria-hidden="true" /></button>
      </div>
      <div id="collection-filters" v-show="filtersOpen" class="collection-filters">
        <div class="select-filters"><label for="family">Family <select id="family" v-model="family" aria-label="Filter by family"><option value="">All families</option><option v-for="item in families" :key="item">{{ item }}</option></select></label><label for="year">Observation year <select id="year" v-model="year" aria-label="Filter by observation year"><option value="">All years</option><option v-for="item in years" :key="item">{{ item }}</option></select></label></div>
        <div class="filter-reset-bar"><p>Choose a genus <em>or</em> a family, then add characteristics to refine your results.</p><button class="button button-outline filter-reset-button" type="button" :disabled="!hasFilters" @click="reset">Clear all filters <X :size="14" /></button></div>
        <section class="taxonomy-browser" aria-labelledby="taxonomy-heading">
          <div class="taxonomy-browser-heading"><h3 id="taxonomy-heading">Quick taxonomic filters</h3><div class="taxonomy-heading-actions"><p>Genus and family selections replace one another</p><button type="button" class="text-button" :disabled="!genus && !family" @click="clearTaxonomy">Clear taxonomy <X :size="12" /></button></div></div>
          <div class="taxonomy-browser-sections">
            <TaxonomyFilter :key="`genus-${resetVersion}`" field="genus" :entries="taxonomy.genera" :selected="genus" />
            <TaxonomyFilter :key="`family-${resetVersion}`" field="family" :entries="taxonomy.families" :selected="family" />
          </div>
        </section>
        <CharacteristicFilters :key="`characteristics-${resetVersion}`" :groups="characteristicFilters" :selections="characteristics" :counts="characteristicCounts" @change="changeCharacteristic" @clear="clearCharacteristics" />
        <div class="alphabet" aria-label="Filter species by initial letter"><button :class="{ selected: !letter }" @click="letter = ''">All</button><button v-for="initial in letters" :key="initial" :class="{ selected: letter === initial }" :aria-pressed="letter === initial" @click="letter = initial">{{ initial }}</button></div>
        <div class="filter-panel-footer"><button class="button button-dark" type="button" @click="filtersOpen = false; explore()">Show {{ filtered.length }} {{ filtered.length === 1 ? 'species' : 'species & taxa' }} <ArrowDown :size="16" /></button></div>
      </div>
      <div class="results-bar">
        <p aria-live="polite">
          {{ filtered.length }} {{ filtered.length === 1 ? 'species' : 'species & taxa' }}
          <span v-if="genus" class="tag-filter taxonomy-active-chip">Genus: <em>{{ genus }}</em><button aria-label="Remove genus filter" @click="genus = ''"><X :size="12" /></button></span>
          <span v-if="family" class="tag-filter taxonomy-active-chip">Family: {{ family }}<button aria-label="Remove family filter" @click="family = ''"><X :size="12" /></button></span>
          <span v-for="item in activeCharacteristics" :key="`${item.group}:${item.value}`" class="tag-filter characteristic-active-chip"><span>{{ item.title }}: {{ item.label }}</span><button :aria-label="`Remove ${item.title} ${item.label} filter`" @click="removeCharacteristic(item.group, item.value)"><X :size="12" /></button></span>
          <span v-if="tag" class="tag-filter">#{{ tag }} <button aria-label="Remove hashtag filter" @click="tag = ''"><X :size="12" /></button></span>
          <button v-if="hasFilters" class="text-button clear-filters" @click="reset">Clear filters <X :size="12" /></button>
        </p>
        <label>Sort by <select v-model="sort" aria-label="Sort species"><option value="name">Latin name, A–Z</option><option value="newest">Latest encounter</option><option value="observations">Most encounters</option></select></label>
      </div>
      <div id="collection-photos" class="collection-photos" tabindex="-1" role="region" aria-label="Collection photos">
        <div v-if="visible.length" class="species-grid">
          <div v-for="item in visible" :key="item.id" class="species-card">
            <RouterLink :to="{ name: 'detail', params: { id: item.id } }" class="species-card-link" :aria-label="`${item.latinName}, ${item.observations.length} observations`">
              <MediaFrame :photo="cover(item)" :name="item.latinName" :seed="item.id" thumbnail>
                <span v-if="item.observations.length > 1" class="card-count"><BookOpen :size="12" />{{ item.observations.length }}</span>
                <div class="card-caption"><span><em>{{ item.latinName }}</em><small>{{ item.commonName || item.family || 'A closer look' }}</small></span><ArrowRight :size="17" /></div>
              </MediaFrame>
            </RouterLink>
            <RouterLink v-if="item.family" :to="familyLink(item.family)" class="card-family" :aria-label="`Show family ${item.family}`" :title="`Filter collection by family ${item.family}`" :aria-current="family === item.family ? 'true' : undefined">{{ item.family }}</RouterLink>
            <span v-else class="card-family">Field discovery</span>
          </div>
        </div>
        <div v-else class="empty-state"><Search :size="30" :stroke-width="1" /><h3>No discoveries here just yet.</h3><p>Try a different name, taxonomy, or characteristic combination.</p><button class="button button-dark" @click="reset">Reset filters</button></div>
      </div>
      <div v-if="visible.length" class="collection-bottom"><p>Showing {{ visible.length }} of {{ filtered.length }} species</p><button v-if="visible.length < filtered.length" class="button button-outline" @click="limit += 36">More discoveries <ArrowDown :size="16" /></button><span v-else class="end-note">You’ve reached the edge of the collection.</span></div>
      <aside class="prototype-note"><Camera :size="18" /><p><strong>A growing encyclopedia.</strong> Original photographs, scientific descriptions, and field encounters — connected by curiosity. Profiles are drawn from the latest recorded captions.</p></aside>
    </section>
  </div>
</template>
