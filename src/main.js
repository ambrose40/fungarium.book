import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import GalleryView from './views/GalleryView.vue'
import './style.css'
import './dark-theme.css'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'gallery', component: GalleryView },
    { path: '/fungi/:id', name: 'detail', component: () => import('./views/DetailView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
  },
})

createApp(App).use(router).mount('#app')
