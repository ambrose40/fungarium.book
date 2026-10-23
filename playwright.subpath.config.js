import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/subpath',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4174/encyclopedia/',
    channel: 'chrome',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview:encyclopedia -- --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/encyclopedia/',
    reuseExistingServer: false,
  },
})
