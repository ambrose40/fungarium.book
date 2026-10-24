import { createApp } from 'vue'
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import App from './App.vue'
import { species } from './data'
import { applyPageMetadata, pageMetadata } from './lib/seo.mjs'
import './fonts.css'
import './style.css'
import './dark-theme.css'
import './seo-fallback.css'
import './accessibility.css'

// Existing hash bookmarks retain their behavior; new visits use static, crawlable URLs.
const legacyHash = window.location.hash.startsWith('#/')
if (!legacyHash) window.addEventListener('hashchange', () => {
  if (!window.location.hash.startsWith('#/')) return
  const target = new URL(import.meta.env.BASE_URL, window.location.origin)
  target.hash = window.location.hash
  if (target.pathname === window.location.pathname) window.location.reload()
  else window.location.replace(target.href)
})
const router = createRouter({
  history: legacyHash ? createWebHashHistory(import.meta.env.BASE_URL) : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'gallery', component: () => import('./views/GalleryView.vue') },
    { path: legacyHash ? '/fungi/:id' : '/fungi/:id/', name: 'detail', component: () => import('./views/DetailView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
  },
})

router.afterEach(to => {
  const item = to.name === 'detail' ? species.find(record => record.id === to.params.id) : null
  applyPageMetadata(pageMetadata({ item, species, query: to.query, base: import.meta.env.BASE_URL, origin: import.meta.env.VITE_SITE_ORIGIN, error: to.name === 'detail' && !item ? 'not-found' : '' }))
})

router.beforeResolve(async to => {
  if (to.name !== 'detail') return
  const { loadSpecies } = await import('./species-data')
  try { await loadSpecies(to.params.id) } catch { /* Detail view provides the existing load-error state. */ }
})

// Keep the readable static page until the initial route's lazy modules are ready.
const app = createApp(App)
app.use(router)
router.isReady().then(() => app.mount('#app'))
