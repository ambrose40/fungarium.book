import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { googleMapsApiKey } from './scripts/maps-config.mjs'
import { seoPagesPlugin } from './scripts/seo-pages.mjs'
import { siteOrigin } from './src/lib/seo.mjs'
import { bundleReportPlugin } from './scripts/bundle-report.mjs'

export default defineConfig(({ mode }) => {
  const coverage = mode === 'coverage'
  const environment = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), ['GOOGLE_MAPS_', 'SITE_'])
  const origin = siteOrigin(environment.SITE_ORIGIN)
  return {
    plugins: [vue(), seoPagesPlugin({ origin }), bundleReportPlugin()],
    define: {
      'import.meta.env.VITE_SITE_ORIGIN': JSON.stringify(origin),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(coverage ? 'coverage-maps-test-key' : googleMapsApiKey({ environment })),
    },
    build: {
      outDir: coverage ? 'coverage/browser-build' : 'dist',
      sourcemap: coverage ? 'hidden' : false,
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          onlyExplicitManualChunks: true,
          manualChunks(id) {
            const normalized = id.replaceAll('\\', '/')
            if (normalized.endsWith('/src/data/index.json')) return 'catalog'
            if (normalized.endsWith('/src/data/search-index.json')) return 'catalog-search'
            if (normalized.endsWith('/src/data/filter-index.json')) return 'catalog-filters'
            if (/\/node_modules\/(?:@vue\/|vue\/|vue-router\/)/u.test(normalized)) return 'vue-vendor'
          },
        },
      },
    },
  }
})
