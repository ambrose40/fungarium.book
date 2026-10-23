<script setup>
import { computed } from 'vue'
import { MapPin, ArrowUpRight } from 'lucide-vue-next'
import { googleMapsUrl } from '../lib/coordinates.mjs'

const props = defineProps({ coordinates: String, location: String })
const url = computed(() => googleMapsUrl(props.coordinates))
</script>

<template>
  <p v-if="coordinates" class="coordinates">
    <a v-if="url" class="coordinates-link" :href="url" target="_blank" rel="noopener noreferrer" :aria-label="`Open ${coordinates} in Google Maps${location ? ` — ${location}` : ''} (new tab)`" title="Open this location in Google Maps">
      <MapPin :size="12" /><span>{{ coordinates }}</span><ArrowUpRight :size="12" />
    </a>
    <span v-else>{{ coordinates }}</span>
  </p>
</template>
