<script setup>
import { computed, ref, watch } from 'vue'
import { Image } from 'lucide-vue-next'
import { assetUrl } from '../lib/asset-urls.mjs'

const props = defineProps({ photo: Object, name: { type: String, default: '' }, thumbnail: Boolean, compact: Boolean, seed: { type: String, default: '' } })
const failed = ref(false)
const src = computed(() => assetUrl(props.thumbnail ? props.photo?.thumb || props.photo?.src : props.photo?.src))
watch(src, () => { failed.value = false })
const tone = computed(() => [...(props.seed || props.name)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5)
</script>

<template>
  <div class="media-frame" :class="[`tone-${tone}`, { 'is-placeholder': !src || failed, compact }]">
    <img v-if="src && !failed" :src="src" :alt="photo.alt || name" loading="lazy" decoding="async" @error="failed = true" />
    <template v-else>
      <svg class="mushroom-sketch" viewBox="0 0 260 220" fill="none" aria-hidden="true">
        <g stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M42 112c2-45 32-77 82-77 48 0 76 35 84 77-42 17-120 18-166 0Z" />
          <path d="M43 112c43-12 120-12 164 0M113 120c4 29 1 53-9 68 14 5 28 5 43-1-11-16-14-41-10-67M64 111l49 9m-30-14 30 14m-10-17 14 18m17-18-4 17m24-16-17 16m39-13-39 13m58-11-58 11" />
          <path d="M74 75c15-19 34-27 54-26m-70 55 6-15M109 178l-2 10m25-18 9 16M125 132v34M68 186c-1-19-7-29-17-35 1 19 8 31 17 35Zm6 4c1-13 8-22 17-25-2 15-8 22-17 25Zm-29 4c44 6 112 5 145-1m-21-12 5-18m0 18 9-11" />
          <path d="M70 64 54 46m133 15 16-17M29 120l-9 4m201-7 12 3M156 30l3-10" stroke-dasharray="2 5" />
          <circle cx="86" cy="79" r="5" /><path d="M140 61c10-3 17 4 15 11-11 4-17-2-15-11Zm-24 29c5-5 12-3 13 4-5 4-11 2-13-4Z" />
        </g>
      </svg>
      <span v-if="!compact" class="placeholder-note"><Image :size="12" /> Photograph to come</span>
    </template>
    <slot />
  </div>
</template>
