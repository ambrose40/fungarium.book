<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowUpRight, House, Instagram, Menu, X } from 'lucide-vue-next'
import { BRAND_MARK, SITE_NAME } from './branding'
import { MAIN_SITE_URL, OTHER_PROJECTS } from './site-links'
import { parentSitePath } from './lib/seo.mjs'

const route = useRoute()
const about = ref(null)
const menuOpen = ref(false)
const homePath = parentSitePath(import.meta.env.BASE_URL)
function skipToContent() { document.getElementById('main')?.focus() }
watch(() => route.fullPath, () => { menuOpen.value = false })
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="skipToContent">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand" :aria-label="`${SITE_NAME} home`">
        <img class="brand-artwork" :src="BRAND_MARK" alt="" width="52" height="52" />
        <span class="brand-wordmark">Fungarium<span class="brand-domain">.INFO</span><small>ENCYCLOPEDIA</small></span>
      </RouterLink>
      <button class="icon-button mobile-menu" :aria-expanded="menuOpen" aria-label="Toggle navigation" @click="menuOpen = !menuOpen"><X v-if="menuOpen" :size="22" /><Menu v-else :size="22" /></button>
      <nav :class="{ 'is-open': menuOpen }" aria-label="Main navigation">
        <a :href="homePath" class="home-link" @click="menuOpen = false"><House :size="14" /> Home</a>
        <RouterLink to="/" :class="{ active: route.name === 'gallery' }" @click="menuOpen = false">The collection</RouterLink>
        <button class="nav-button" @click="about.showModal(); menuOpen = false">About the journal</button>
        <a class="main-domain-link" :href="MAIN_SITE_URL" target="_blank" rel="noopener noreferrer" aria-label="Fungarium.INFO main website" @click="menuOpen = false">Fungarium.INFO <ArrowUpRight :size="14" /></a>
        <a class="instagram-link" href="https://www.instagram.com/fungarium.info/" target="_blank" rel="noopener noreferrer" aria-label="Instagram — @fungarium.info" @click="menuOpen = false"><Instagram :size="16" /> <span>Instagram</span><ArrowUpRight :size="15" /></a>
      </nav>
    </div>
  </header>
  <main id="main" tabindex="-1"><RouterView /></main>
  <footer class="site-footer container">
    <div class="footer-top">
      <div class="footer-identity"><RouterLink class="footer-brand" to="/" :aria-label="`${SITE_NAME} home`"><img :src="BRAND_MARK" alt="" width="38" height="38" /><span>Fungarium<span class="brand-domain">.INFO</span><small>ENCYCLOPEDIA</small></span></RouterLink><p>A little curiosity. A closer look.</p></div>
      <p class="footer-credit">Photography & field notes by <a href="https://www.instagram.com/fungarium.info/" target="_blank" rel="noopener noreferrer">@fungarium.info <ArrowUpRight :size="13" /></a><br /><span>Made for the wonderfully overlooked.</span></p>
    </div>
    <section class="footer-projects" aria-labelledby="footer-projects-title">
      <h2 id="footer-projects-title">My other projects</h2>
      <nav aria-label="Other projects">
        <p class="project-links">
          <span v-for="project in OTHER_PROJECTS" :key="project.url" class="project-item"><span class="project-separator" aria-hidden="true">&bull;</span><a class="link" :href="project.url" target="_blank" rel="noopener noreferrer">{{ project.name }}</a></span>
          <span class="project-separator" aria-hidden="true">&bull;</span>
        </p>
      </nav>
    </section>
  </footer>
  <dialog ref="about" class="about-dialog" @click="event => { if (event.target === about) about.close() }">
    <button class="icon-button dialog-close" aria-label="Close about dialog" @click="about.close()"><X :size="22" /></button>
    <img class="about-mark" :src="BRAND_MARK" alt="Fungarium mushroom artwork" width="80" height="80" /><p class="eyebrow">THE STORY BEHIND THE SPORES</p>
    <h2>Fungarium.INFO<br /><em>Encyclopedia.</em></h2>
    <p>A photographic encyclopedia bringing together the fungi, slime moulds, and tiny woodland discoveries documented by <a href="https://www.instagram.com/fungarium.info/" target="_blank" rel="noopener noreferrer">@fungarium.info</a>.</p>
    <p>Each species has a scientific profile taken from its most recent dated caption, alongside a journal of individual encounters: where it grew, what the weather was like, and how the photograph was made.</p>
    <p class="muted">Part of <a :href="MAIN_SITE_URL" target="_blank" rel="noopener noreferrer">Fungarium.INFO</a> — a closer look at the wonderfully overlooked.</p>
    <button class="button button-dark" @click="about.close()">Back to exploring <ArrowUpRight :size="16" /></button>
  </dialog>
</template>
