<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-vue-next'
import { TOP_NINE_SLIDES as slides } from '../lib/top-nine.mjs'
import { assetUrl } from '../lib/asset-urls.mjs'

const active = ref(0)
const paused = ref(false)
const hovered = ref(false)
const hidden = ref(false)
const rotating = computed(() => !paused.value && !hovered.value && !hidden.value)
let timer
let motionPreference
let mounted = false
let swipeStart = null

function goTo(index, manual = true) {
  active.value = (index + slides.length) % slides.length
  if (manual) paused.value = true
}
function restartTimer() {
  window.clearInterval(timer)
  if (mounted && rotating.value) timer = window.setInterval(() => goTo(active.value + 1, false), 5000)
}
function onVisibilityChange() { hidden.value = document.hidden }
function onMotionChange(event) { if (event.matches) paused.value = true }
function onFocus(event) {
  // Keep the rotation button's advertised action stable while it receives focus.
  if (!event.target.closest('.top-nine-toggle')) paused.value = true
}
function startSwipe(event) {
  swipeStart = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null
}
function finishSwipe(event) {
  if (!swipeStart) return
  const dx = event.clientX - swipeStart.x
  const dy = event.clientY - swipeStart.y
  swipeStart = null
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goTo(active.value + (dx < 0 ? 1 : -1))
}
watch(rotating, restartTimer)
onMounted(() => {
  mounted = true
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  paused.value = motionPreference.matches
  hidden.value = document.hidden
  motionPreference.addEventListener('change', onMotionChange)
  document.addEventListener('visibilitychange', onVisibilityChange)
  restartTimer()
})
onUnmounted(() => {
  mounted = false
  window.clearInterval(timer)
  motionPreference?.removeEventListener('change', onMotionChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <section class="hero-photo top-nine-slideshow" role="region" aria-roledescription="carousel" aria-label="TopNine annual photo collections" @mouseenter="hovered = true" @mouseleave="hovered = false" @focusin="onFocus" @keydown.left.prevent="goTo(active - 1)" @keydown.right.prevent="goTo(active + 1)">
    <figure>
    <div class="top-nine-viewport" :aria-live="rotating ? 'off' : 'polite'" aria-atomic="true" @pointerdown="startSwipe" @pointerup="finishSwipe" @pointercancel="swipeStart = null">
      <div class="top-nine-track" :style="{ transform: `translateX(-${active * 100}%)` }">
        <div v-for="(slide, index) in slides" :key="slide.year" class="top-nine-slide" role="group" aria-roledescription="slide" :aria-label="`${slide.year}, slide ${index + 1} of ${slides.length}`" :aria-hidden="index !== active">
          <img :src="assetUrl(slide.src)" :alt="slide.alt" :data-active="index === active" :fetchpriority="index === 0 ? 'high' : 'low'" decoding="async" draggable="false" />
        </div>
      </div>
    </div>
    <div class="top-nine-controls">
      <div class="top-nine-years" role="group" aria-label="Choose a TopNine year">
        <button v-for="(slide, index) in slides" :key="slide.year" type="button" :aria-label="`Show TopNine ${slide.year}`" :aria-pressed="active === index" :class="{ selected: active === index }" @click="goTo(index)">{{ slide.year }}</button>
      </div>
      <div class="top-nine-playback">
        <button type="button" class="top-nine-control" aria-label="Previous TopNine slide" @click="goTo(active - 1)"><ChevronLeft :size="15" /></button>
        <button type="button" class="top-nine-control top-nine-toggle" :aria-label="paused ? 'Play TopNine slideshow' : 'Pause TopNine slideshow'" @click="paused = !paused"><Play v-if="paused" :size="13" /><Pause v-else :size="13" /></button>
        <button type="button" class="top-nine-control" aria-label="Next TopNine slide" @click="goTo(active + 1)"><ChevronRight :size="15" /></button>
      </div>
    </div>
    <figcaption><span>THE MANY FORMS OF FUNGI</span><span>TopNine {{ slides[active].year }} · {{ active + 1 }} / {{ slides.length }}</span></figcaption>
    <span class="photo-side-note">OBSERVE · DOCUMENT · WONDER</span>
    </figure>
  </section>
</template>

<style scoped>
.top-nine-slideshow{width:100%;min-width:0}
.top-nine-viewport{overflow:hidden;aspect-ratio:1;border:1px solid #3a3833;border-radius:4px;background:#050505;box-shadow:0 16px 45px #0008;touch-action:pan-y}
.top-nine-track{display:flex;width:100%;height:100%;transition:transform .65s cubic-bezier(.22,.61,.36,1);will-change:transform}
.top-nine-slide{flex:0 0 100%;width:100%;min-width:0;height:100%;overflow:hidden}
.top-nine-slide img{display:block;width:100%;height:100%;aspect-ratio:1;object-fit:contain;border:0;border-radius:0;box-shadow:none;transform:none;user-select:none}
.top-nine-controls{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 3px 0}
.top-nine-years,.top-nine-playback{display:flex;align-items:center;gap:4px}
.top-nine-years button{padding:5px 7px;font-size:9px;line-height:1.4;background:transparent;color:var(--muted);border:1px solid transparent;border-radius:3px;transition:background .2s,color .2s}
.top-nine-years button.selected{background:var(--accent-soft);border-color:#775044;color:#f1bca7}
.top-nine-years button:hover,.top-nine-control:hover{color:var(--text);background:#29241f}
.top-nine-control{display:flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;background:transparent;color:var(--text-secondary);border:1px solid var(--line);border-radius:3px}
.top-nine-slideshow figcaption{margin-top:12px;gap:12px}
@media(max-width:600px){.top-nine-controls{gap:6px;margin-top:10px}.top-nine-years button{padding:4px 6px;font-size:8px}.top-nine-playback{gap:3px}.top-nine-control{width:24px;height:24px}.top-nine-slideshow figcaption{font-size:6px}.top-nine-slideshow figcaption>span:last-child{font-size:7px}}
@media(prefers-reduced-motion:reduce){.top-nine-track{transition:none}}
</style>
