import { defineConfig } from '@playwright/test'

export default defineConfig({
  fullyParallel: true,
  workers: 4,
  timeout: 60000,
  outputDir: './coverage/playwright',
  metadata: { buildDirectory: 'coverage/browser-build' },
  projects: [
    { name: 'ui', testDir: './tests/browser' },
    { name: 'accessibility', testDir: './tests/accessibility', fullyParallel: false },
  ],
  use: { baseURL: 'http://127.0.0.1:4178', channel: 'chrome', screenshot: 'only-on-failure', collectCoverage: true },
  webServer: {
    command: 'npm run preview -- --outDir coverage/browser-build --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: false,
  },
})
