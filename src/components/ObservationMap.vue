<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MapPin } from 'lucide-vue-next'
import { parseCoordinates } from '../lib/coordinates.mjs'
import { loadGoogleMaps, mapsConfigured, onMapsAuthenticationFailure } from '../lib/google-maps.mjs'

const props = defineProps({ observations: { type: Array, default: () => [] }, speciesName: String })
const points = computed(() => props.observations.flatMap(post => {
  const coordinates = parseCoordinates(post.coordinates)
  return coordinates ? [{
    position: { lat: coordinates.latitude, lng: coordinates.longitude },
    title: `${post.location || 'Observation location'} · ${post.observedAt || post.date}`,
  }] : []
}))
const container = ref(null)
const canvas = ref(null)
const state = ref('waiting')
let observer
let map
let maps
let unsubscribe
let disposed = false

async function showMap() {
  if (state.value !== 'waiting') return
  state.value = 'loading'
  try {
    maps = await loadGoogleMaps()
    if (disposed || state.value === 'error') return
    const center = points.value[0].position
    map = new maps.Map(canvas.value, {
      center, zoom: 14, mapTypeId: 'terrain', gestureHandling: 'cooperative',
      streetViewControl: false, mapTypeControl: true, fullscreenControl: true,
    })
    // Keep one feature per observation, including repeat encounters at one location.
    for (const point of points.value) {
      map.data.add({ geometry: new maps.Data.Point(point.position), properties: { title: point.title } })
    }
    map.data.setStyle(feature => ({ title: feature.getProperty('title') }))
    const locations = new Set(points.value.map(point => `${point.position.lat},${point.position.lng}`))
    if (locations.size > 1) {
      const bounds = new maps.LatLngBounds()
      for (const point of points.value) bounds.extend(point.position)
      map.fitBounds(bounds, 40)
    }
    state.value = 'ready'
  } catch {
    if (!disposed) state.value = 'error'
  }
}

onMounted(() => {
  if (!mapsConfigured || !points.value.length) return
  unsubscribe = onMapsAuthenticationFailure(() => { state.value = 'error' })
  if (!window.IntersectionObserver) { showMap(); return }
  observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting && entry.boundingClientRect.height > 0)) return
    if (map) maps.event.trigger(map, 'resize')
    else showMap()
  }, { rootMargin: '200px' })
  observer.observe(container.value)
})

onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  unsubscribe?.()
  if (map) {
    maps.event.clearInstanceListeners(map)
    map.data.setMap(null)
    map = null
  }
})
</script>

<template>
  <figure v-if="mapsConfigured && points.length" ref="container" class="observation-map" :data-map-state="state" :aria-label="`Observation locations: ${speciesName || 'this species'}`">
    <figcaption><MapPin :size="14" /><span>Observation locations<span v-if="speciesName"> · {{ speciesName }}</span></span><small>{{ points.length }} {{ points.length === 1 ? 'pin' : 'pins' }} · Google Maps</small></figcaption>
    <div class="observation-map-frame">
      <div v-show="state !== 'error'" ref="canvas" class="observation-map-canvas" role="region" :aria-label="`Google Map of observation locations for ${speciesName || 'this species'}`" aria-describedby="observation-map-help" />
      <p :class="state === 'ready' ? 'sr-only' : 'observation-map-status'" role="status" aria-live="polite" aria-atomic="true">{{ state === 'error' ? 'The map is unavailable. Use the coordinate links in the field encounters below to open individual locations in Google Maps.' : state === 'loading' ? 'Loading Google Maps…' : state === 'ready' ? `Map loaded with ${points.length} observation locations.` : 'Map loads when it comes into view.' }}</p>
    </div>
    <p id="observation-map-help" class="observation-map-help">Observation coordinates are also available as links in each field encounter below.</p>
  </figure>
</template>

<style scoped>
.observation-map{min-width:0;margin:0 0 24px;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:var(--surface)}
.observation-map figcaption{display:flex;align-items:center;gap:8px;padding:12px 15px;font-size:11px;color:var(--text-secondary)}
.observation-map figcaption>svg{color:var(--accent)}
.observation-map figcaption>span{flex:1;min-width:0;overflow-wrap:anywhere}
.observation-map figcaption>small{flex-shrink:0;font-size:9px;color:var(--muted)}
.observation-map-frame{position:relative;height:300px;background:#1b211c;color:#333;color-scheme:light}
.observation-map-canvas{height:100%;width:100%}
.observation-map-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:25px;color:var(--text-secondary);background:var(--surface);font-size:12px;pointer-events:none}
@media(max-width:600px){.observation-map-frame{height:260px}.observation-map figcaption{padding:10px 12px;font-size:10px}}
</style>
