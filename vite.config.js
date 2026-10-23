import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { googleMapsApiKey } from './scripts/maps-config.mjs'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  define: {
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsApiKey({
      environment: loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'GOOGLE_MAPS_'),
    })),
  },
}))
