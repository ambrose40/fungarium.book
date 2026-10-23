import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { googleMapsApiKey } from './scripts/maps-config.mjs'
import { seoPagesPlugin } from './scripts/seo-pages.mjs'
import { siteOrigin } from './src/lib/seo.mjs'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), ['GOOGLE_MAPS_', 'SITE_'])
  const origin = siteOrigin(environment.SITE_ORIGIN)
  return {
    plugins: [vue(), seoPagesPlugin({ origin })],
    define: {
      'import.meta.env.VITE_SITE_ORIGIN': JSON.stringify(origin),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsApiKey({ environment })),
    },
  }
})
