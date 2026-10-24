<script setup>
import { computed } from 'vue'
import { assetUrl } from '../lib/asset-urls.mjs'
import { MYCOLOGY_ART_ICONS } from '../lib/mycology-art-index.mjs'

const props = defineProps({ icon: { type: String, required: true }, color: String })
const available = new Set(MYCOLOGY_ART_ICONS)
const swatch = computed(() => ['spore-print', 'spore-mass'].includes(props.icon) && props.color)
const special = computed(() => props.icon === 'unknown' || props.icon === 'spore-none' || props.icon === 'edibility-unknown')
const image = computed(() => assetUrl(`/illustrations/mycology/${props.icon}.webp`))
</script>

<template>
  <svg v-if="swatch" class="mycology-glyph mycology-swatch" viewBox="0 0 96 80" aria-hidden="true" :data-variant="icon">
    <circle cx="48" cy="40" r="26" :fill="color" stroke="#8b8473" stroke-width="1.25" />
  </svg>
  <svg v-else-if="special || !available.has(icon)" class="mycology-glyph mycology-unknown" viewBox="0 0 96 80" fill="none" aria-hidden="true" :data-variant="icon">
    <circle cx="48" cy="40" r="25" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" />
    <path v-if="icon === 'spore-none'" d="M29 59 67 21" stroke="currentColor" stroke-width="1.5" />
    <text v-else x="48" y="51" fill="currentColor" text-anchor="middle" font-family="Georgia, serif" font-size="32">?</text>
  </svg>
  <img v-else class="mycology-glyph mycology-illustration" :src="image" :data-variant="icon" width="160" height="132" alt="" loading="lazy" decoding="async" />
</template>
