import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const content = JSON.parse(await readFile(new URL('../../src/data/index.json', import.meta.url), 'utf8'))
const photographed = content.species.find(item => item.observations.some(post => post.photos.length))

test('the encyclopedia boots under its production folder with prefixed branding, icons and manifest', async ({ page, request }) => {
  const errors = []
  const escapedRequests = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', incoming => {
    const url = new URL(incoming.url())
    if (url.origin === 'http://127.0.0.1:4174' && !url.pathname.startsWith('/encyclopedia/')) escapedRequests.push(url.pathname)
  })
  await page.goto('./#/')
  await expect(page).toHaveTitle('Fungarium.INFO Encyclopedia')
  await expect(page.locator('.species-card')).toHaveCount(36)
  expect(await page.locator('.brand').evaluate(link => link.href)).toBe('http://127.0.0.1:4174/encyclopedia/#/')
  await expect(page.locator('.brand-artwork')).toHaveAttribute('src', '/encyclopedia/branding/fungarium-mark.png')
  await expect.poll(() => page.locator('.brand-artwork').evaluate(image => image.naturalWidth)).toBe(192)
  await expect(page.locator('.hero-photo img').first()).toHaveAttribute('src', '/encyclopedia/images/fungarium-2024.jpeg')
  await expect.poll(() => page.locator('.hero-photo img').first().evaluate(image => image.naturalWidth)).toBeGreaterThan(0)

  const icon = page.locator('link[rel="icon"][sizes="32x32"]')
  await expect(icon).toHaveAttribute('href', '/encyclopedia/icons/favicon-32x32.png')
  const iconResponse = await request.get(await icon.getAttribute('href'))
  expect(iconResponse.ok()).toBe(true)
  expect(iconResponse.headers()['content-type']).toContain('image/png')

  const manifestPath = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestPath).toBe('/encyclopedia/site.webmanifest')
  const manifestUrl = new URL(manifestPath, page.url())
  const manifest = await (await request.get(manifestUrl.href)).json()
  expect(new URL(manifest.start_url, manifestUrl).pathname).toBe('/encyclopedia/')
  expect(new URL(manifest.start_url, manifestUrl).hash).toBe('#/')
  expect(new URL(manifest.scope, manifestUrl).pathname).toBe('/encyclopedia/')
  for (const image of manifest.icons) {
    const url = new URL(image.src, manifestUrl)
    expect(url.pathname).toMatch(/^\/encyclopedia\/icons\//)
    expect((await request.get(url.href)).ok()).toBe(true)
  }
  expect(errors).toEqual([])
  expect(escapedRequests).toEqual([])
})

test('direct species URLs and shareable filters stay inside the encyclopedia folder', async ({ page }) => {
  await page.goto('./#/fungi/amanita-muscaria')
  await expect(page.locator('.species-heading h1')).toHaveText('Amanita muscaria')
  await expect(page.locator('.mycology-panel')).toBeVisible()
  await page.getByRole('link', { name: 'Back to the collection' }).click()
  await expect(page).toHaveURL('http://127.0.0.1:4174/encyclopedia/#/')
  await page.goto('./#/?genus=Amanita&mc.spore-print=white')
  await expect(page.locator('.species-card').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove genus filter' })).toBeVisible()
  await expect(page.locator('.characteristic-active-chip')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.characteristic-active-chip')).toHaveCount(1)
  await page.locator('.species-card').first().click()
  await expect(page).toHaveURL(/\/encyclopedia\/#\/fungi\/amanita-/)
})

test('downloaded thumbnails, original photos and the lightbox use the deployment base', async ({ page }) => {
  test.skip(!photographed, 'No local post photographs are available in this checkout.')
  await page.goto(`./#/fungi/${photographed.id}`)
  const featured = page.locator('.featured-button img')
  await expect(featured).toBeVisible()
  await expect(featured).toHaveAttribute('src', /^\/encyclopedia\/images\//)
  await expect.poll(() => featured.evaluate(image => image.naturalWidth)).toBeGreaterThan(0)
  const thumbnail = page.locator('.encounter-photos img').first()
  await expect(thumbnail).toHaveAttribute('src', /^\/encyclopedia\/(?:thumbs|images)\//)
  await page.locator('.featured-button').click()
  const enlarged = page.locator('.lightbox > img')
  await expect(enlarged).toBeVisible()
  await expect(enlarged).toHaveAttribute('src', /^\/encyclopedia\/images\//)
  await expect.poll(() => enlarged.evaluate(image => image.naturalWidth)).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).not.toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('all annual TopNine slides load inside the encyclopedia deployment folder', async ({ page }) => {
  await page.goto('./#/')
  const carousel = page.getByRole('region', { name: 'TopNine annual photo collections' })
  await expect(carousel.locator('.top-nine-slide')).toHaveCount(3)
  for (const year of ['2024', '2025', '2026']) {
    await carousel.getByRole('button', { name: `Show TopNine ${year}` }).click()
    const image = carousel.locator('img[data-active="true"]')
    await expect(image).toHaveAttribute('src', `/encyclopedia/images/fungarium-${year}.jpeg`)
    await expect.poll(() => image.evaluate(element => element.naturalWidth)).toBeGreaterThan(0)
  }
  await expect(page).toHaveURL('http://127.0.0.1:4174/encyclopedia/#/')
})
