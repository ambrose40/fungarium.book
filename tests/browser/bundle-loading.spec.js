import { readFile } from 'node:fs/promises'
import { test, expect } from '../helpers/browser.js'

test('production JavaScript chunks stay within the 500 kB minified budget', async () => {
  const report = JSON.parse(await readFile(new URL('../../dist/.vite/bundle-report.json', import.meta.url), 'utf8'))
  expect(report.warningLimitBytes).toBe(500000)
  expect(report.chunks.length).toBeGreaterThan(0)
  for (const chunk of report.chunks) expect(chunk.bytes, chunk.file).toBeLessThanOrEqual(report.warningLimitBytes)
})

test('direct profiles defer gallery search/filter chunks until collection navigation', async ({ page }) => {
  const scripts = new Set()
  page.on('request', request => { if (request.resourceType() === 'script') scripts.add(new URL(request.url()).pathname) })
  await page.goto('/fungi/boletus-edulis/')
  await expect(page.locator('.species-heading h1')).toHaveText('Boletus edulis')
  for (const name of ['GalleryView', 'catalog-search', 'catalog-filters']) expect([...scripts].some(file => file.includes(`/${name}-`)), name).toBe(false)
  await page.getByRole('link', { name: 'Back to the collection', exact: true }).click()
  await expect(page.locator('.species-card')).toHaveCount(36)
  for (const name of ['GalleryView', 'catalog-search', 'catalog-filters']) expect([...scripts].some(file => file.includes(`/${name}-`)), name).toBe(true)
  await page.getByLabel('Search scope').selectOption('trait:plasmodium-phase')
  await page.getByRole('searchbox').fill('watery')
  await expect(page.locator('.species-card')).toHaveCount(1)
  await expect(page.locator('.species-card')).toContainText('Ceratiomyxa fruticulosa')
})
