<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, ArrowRight, ArrowUpRight, MapPin, CloudSun, Camera, CalendarDays, ChevronDown, BookOpen, Microscope, X, ChevronLeft, ChevronRight, Image, ExternalLink } from 'lucide-vue-next'
import { species, formatDate, loadSpecies } from '../data'
import { SITE_NAME } from '../branding'
import { assetUrl } from '../lib/asset-urls.mjs'
import MediaFrame from '../components/MediaFrame.vue'
import MycologicalCharacteristics from '../components/MycologicalCharacteristics.vue'
import CoordinatesLink from '../components/CoordinatesLink.vue'

const route = useRoute()
const fungus = ref(null)
const loading = ref(true)
const loadError = ref(false)
let requestId = 0
watch(() => route.params.id, async id => {
  const request = ++requestId
  loading.value = true
  loadError.value = false
  try {
    const result = await loadSpecies(id)
    if (request === requestId) fungus.value = result
  } catch {
    if (request === requestId) { fungus.value = null; loadError.value = true }
  } finally { if (request === requestId) loading.value = false }
}, { immediate: true })
const index = computed(() => species.findIndex(item => item.id === route.params.id))
const previous = computed(() => species[index.value - 1])
const next = computed(() => species[index.value + 1])
const featured = computed(() => fungus.value?.observations.find(post => post.photos.length))
const activePhoto = ref(0)
const showAllTags = ref(false)
const lightbox = ref(null)
const lightboxPhotos = ref([])
const lightboxIndex = ref(0)
watch(fungus, item => {
  activePhoto.value = 0
  showAllTags.value = false
  document.title = `${item ? item.latinName : 'Species not found'} — ${SITE_NAME}`
}, { immediate: true })
const tags = computed(() => showAllTags.value ? fungus.value.hashtags : fungus.value.hashtags.slice(0, 24))
function openLightbox(photos, photoIndex = 0) {
  if (!photos?.length) return
  lightboxPhotos.value = photos
  lightboxIndex.value = photoIndex
  lightbox.value.showModal()
}
function movePhoto(direction) {
  lightboxIndex.value = (lightboxIndex.value + direction + lightboxPhotos.value.length) % lightboxPhotos.value.length
}
function scrollToSection(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }
</script>

<template>
  <div v-if="loading" class="container empty-state" role="status">
    <BookOpen :size="30" :stroke-width="1" /><p>Opening the encyclopedia…</p>
  </div>
  <div v-else-if="fungus" class="container detail-page">
    <div class="detail-navigation">
      <RouterLink to="/" class="back-link"><ArrowLeft :size="16" /> Back to the collection</RouterLink>
      <div class="species-pagination">
        <RouterLink v-if="previous" :to="`/fungi/${previous.id}`" :aria-label="`Previous species: ${previous.latinName}`"><ChevronLeft :size="18" /></RouterLink>
        <span>{{ index + 1 }} / {{ species.length }}</span>
        <RouterLink v-if="next" :to="`/fungi/${next.id}`" :aria-label="`Next species: ${next.latinName}`"><ChevronRight :size="18" /></RouterLink>
      </div>
    </div>
    <header class="species-heading">
      <p class="eyebrow">{{ fungus.family || 'FIELD DISCOVERY' }} <span> / </span> SPECIES PROFILE</p>
      <div><h1><em>{{ fungus.latinName }}</em></h1><span class="encounter-pill"><BookOpen :size="14" /> {{ fungus.observations.length }} {{ fungus.observations.length === 1 ? 'encounter' : 'encounters' }}</span></div>
      <p class="species-authority">{{ fungus.identification }}</p>
    </header>
    <div class="species-overview">
      <div class="featured-media">
        <button class="featured-button" :disabled="!featured" :aria-label="`View photograph of ${fungus.latinName}`" @click="openLightbox(featured?.photos, activePhoto)">
          <MediaFrame :photo="featured?.photos[activePhoto]" :name="fungus.latinName" :seed="fungus.id" />
          <span v-if="featured" class="view-photo"><Image :size="15" /> View photograph</span>
        </button>
        <div v-if="featured?.photos.length > 1" class="photo-thumbnails">
          <button v-for="(photo, photoIndex) in featured.photos" :key="photo.src" :class="{ selected: activePhoto === photoIndex }" :aria-label="`Select photograph ${photoIndex + 1}`" :aria-pressed="activePhoto === photoIndex" @click="activePhoto = photoIndex">
            <MediaFrame :photo="photo" :name="fungus.latinName" thumbnail compact />
          </button>
        </div>
        <p class="media-caption"><Camera :size="13" /> {{ featured ? `${formatDate(featured.date)} · @fungarium.info` : 'Original photography space · images to be added' }}</p>
      </div>
      <aside class="species-facts">
        <p class="eyebrow">A NAME FOR THE DISCOVERY</p>
        <h2>{{ fungus.commonName || fungus.latinName }}</h2>
        <p v-if="fungus.description" class="species-intro">{{ fungus.description }}</p>
        <dl class="taxonomy-list">
          <template v-for="(taxon, i) in fungus.science.taxonomy" :key="taxon">
            <dt>{{ i === 0 ? 'Family' : (fungus.science.taxonomy.length === 3 && i === 1 ? 'Order' : 'Class') }}</dt><dd>{{ taxon }}</dd>
          </template>
          <dt>Genus</dt><dd><em>{{ fungus.genus }}</em></dd>
          <dt>Profile source</dt><dd>{{ fungus.scienceYear }} field notes</dd>
        </dl>
        <h3 class="small-heading">NAMES ACROSS LANGUAGES</h3>
        <ul class="language-list">
          <li v-for="name in fungus.science.commonNames" :key="`${name.flag}-${name.name}`"><span class="language-label"><span aria-hidden="true">{{ name.flag }}</span>{{ name.language }}</span><span>{{ name.name }}</span></li>
        </ul>
        <a v-if="fungus.science.gbifUrl" :href="fungus.science.gbifUrl" target="_blank" rel="noopener noreferrer" class="gbif-link">View on GBIF <ArrowUpRight :size="16" /></a>
      </aside>
    </div>
    <nav class="detail-sections" aria-label="Species page sections">
      <a href="#scientific-profile" @click.prevent="scrollToSection('scientific-profile')"><Microscope :size="16" /> Scientific profile</a>
      <a href="#encounters" @click.prevent="scrollToSection('encounters')"><BookOpen :size="16" /> Field encounters <span>{{ fungus.observations.length }}</span></a>
      <a href="#hashtags" @click.prevent="scrollToSection('hashtags')"># Hashtags</a>
    </nav>
    <section id="scientific-profile" class="science-section">
      <div class="section-heading"><div><p class="eyebrow">GETTING TO KNOW THE SPECIES</p><h2>The scientific profile</h2></div><span class="source-label">From the latest record · {{ fungus.scienceYear }}</span></div>
      <p class="source-note">{{ formatDate(fungus.scienceSource.date) }} · Scientific information is taken only from this latest dated caption.</p>
      <MycologicalCharacteristics :science="fungus.science" :year="fungus.scienceYear" />
      <div v-if="fungus.science.traits.length" class="traits-grid">
        <article v-for="(trait, traitIndex) in fungus.science.traits" :key="traitIndex" class="trait-card" :class="{ 'trait-overview': trait.label === 'Overview' }"><h3>{{ trait.label }}</h3><p>{{ trait.text }}</p></article>
      </div>
      <p v-else class="missing-note">This latest caption does not include a morphological description. Its original text is available in the field encounter below.</p>
      <div v-if="fungus.science.publication || fungus.science.references.length" class="publication">
        <BookOpen :size="22" :stroke-width="1.3" />
        <div><h3>Nomenclature & publication</h3><p v-if="fungus.science.publication">{{ fungus.science.publication }}</p><a v-for="url in fungus.science.references" :key="url" :href="url" target="_blank" rel="noopener noreferrer">{{ url.includes('gbif.org') ? 'GBIF taxon reference' : 'Original taxonomic reference' }} <ArrowUpRight :size="14" /></a></div>
      </div>
    </section>
    <section id="encounters" class="encounters-section">
      <div class="section-heading"><div><p class="eyebrow">SAME SPECIES, DIFFERENT MOMENTS</p><h2>Field encounters<span class="count">{{ fungus.observations.length }}</span></h2></div><p>A record of being there.<br /><span>Newest encounter first.</span></p></div>
      <details v-for="(post, postIndex) in fungus.observations" :key="post.id" class="encounter" :open="postIndex === 0">
        <summary>
          <MediaFrame :photo="post.photos[0]" :name="fungus.latinName" :seed="post.id" compact thumbnail />
          <div class="encounter-summary"><span class="eyebrow">ENCOUNTER {{ String(fungus.observations.length - postIndex).padStart(2, '0') }}</span><h3>{{ formatDate(post.date) }}</h3><p><MapPin :size="14" /> {{ post.location || 'Location not recorded' }}</p></div>
          <span v-if="post.weather" class="encounter-weather"><CloudSun :size="17" /><span>{{ post.weather }}</span></span>
          <ChevronDown class="encounter-chevron" :size="20" />
        </summary>
        <div class="encounter-body">
          <div class="encounter-meta">
            <div><h4><CalendarDays :size="16" /> Date & time</h4><p>{{ post.observedAt || formatDate(post.date) }}</p></div>
            <div><h4><CloudSun :size="16" /> Weather & conditions</h4><p>{{ post.weather || 'Not recorded in this caption.' }}</p></div>
            <div>
              <h4><MapPin :size="16" /> Where it was found</h4><p>{{ post.location || 'Not recorded' }}</p>
              <p v-if="post.habitat" class="habitat">{{ post.habitat }}</p>
              <CoordinatesLink :coordinates="post.coordinates" :location="post.location" />
            </div>
            <div><h4><Camera :size="16" /> Camera & lens</h4><p>{{ post.camera || 'Camera not recorded' }}</p><p v-if="post.lens">{{ post.lens }}</p></div>
          </div>
          <div v-if="post.photos.length" class="encounter-photos">
            <button v-for="(photo, photoIndex) in post.photos" :key="photo.src" :aria-label="`Open photograph ${photoIndex + 1} from ${formatDate(post.date)}`" @click="openLightbox(post.photos, photoIndex)"><MediaFrame :photo="photo" :name="fungus.latinName" thumbnail /></button>
          </div>
          <div v-else class="observation-photo-space"><Image :size="20" :stroke-width="1.3" /><div><strong>Photographs reserved for this encounter</strong><p>{{ post.photoCountText || 'Original photographs to be added' }}</p><code>images/posts/{{ post.id }}/</code></div></div>
          <div v-if="post.photography.length" class="photography-notes"><h4>Making the photograph</h4><ul><li v-for="(line, lineIndex) in post.photography" :key="lineIndex">{{ line }}</li></ul></div>
          <div class="encounter-actions">
            <a v-if="post.instagramUrl" :href="post.instagramUrl" class="text-link" target="_blank" rel="noopener noreferrer">Original Instagram post <ExternalLink :size="14" /></a>
            <span v-else class="muted">Instagram post ID not yet available</span><span class="source-file" :title="post.sourceFile">{{ post.sourceFile }}</span>
          </div>
          <details class="original-caption"><summary>Read the full original caption <ChevronDown :size="15" /></summary><p>{{ post.caption }}</p></details>
        </div>
      </details>
    </section>
    <section id="hashtags" class="hashtags-section">
      <p class="eyebrow">FOLLOW THE THREADS</p><h2>From the field notes</h2><p class="muted">Original hashtags across this species’ encounters.</p>
      <div class="hashtag-list"><RouterLink v-for="tag in tags" :key="tag" :to="{ name: 'gallery', query: { tag } }">#{{ tag }}</RouterLink><button v-if="!showAllTags && fungus.hashtags.length > 24" @click="showAllTags = true">+ {{ fungus.hashtags.length - 24 }} more</button></div>
    </section>
    <div class="bottom-navigation">
      <RouterLink to="/" class="back-link"><ArrowLeft :size="16" /> All discoveries</RouterLink>
      <RouterLink v-if="next" :to="`/fungi/${next.id}`" class="next-species"><span>NEXT IN THE COLLECTION<em>{{ next.latinName }}</em></span><ArrowRight :size="22" /></RouterLink>
    </div>
  </div>
  <div v-else class="container empty-state">
    <h1>{{ loadError ? 'The field notes couldn’t be loaded.' : 'This discovery isn’t in the journal.' }}</h1>
    <p v-if="loadError">Please refresh this page to try again.</p>
    <RouterLink to="/" class="button button-dark">Back to the collection <ArrowLeft :size="16" /></RouterLink>
  </div>
  <dialog ref="lightbox" class="lightbox" @click="event => { if (event.target === lightbox) lightbox.close() }" @keydown.left.prevent="movePhoto(-1)" @keydown.right.prevent="movePhoto(1)">
    <button class="icon-button lightbox-close" aria-label="Close photograph" @click="lightbox.close()"><X :size="26" /></button>
    <template v-if="lightboxPhotos.length">
      <img :src="assetUrl(lightboxPhotos[lightboxIndex].src)" :alt="lightboxPhotos[lightboxIndex].alt || fungus?.latinName" />
      <div class="lightbox-controls"><button class="icon-button" aria-label="Previous photograph" :disabled="lightboxPhotos.length < 2" @click="movePhoto(-1)"><ChevronLeft :size="24" /></button><span>{{ lightboxIndex + 1 }} / {{ lightboxPhotos.length }}</span><button class="icon-button" aria-label="Next photograph" :disabled="lightboxPhotos.length < 2" @click="movePhoto(1)"><ChevronRight :size="24" /></button></div>
    </template>
  </dialog>
</template>
