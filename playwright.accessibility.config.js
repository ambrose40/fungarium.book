import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/accessibility',
  fullyParallel: false,
  workers: 1,
  outputDir: './accessibility-results',
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4176/encyclopedia/', channel: 'chrome', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run preview:encyclopedia -- --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176/encyclopedia/',
    reuseExistingServer: false,
  },
})
