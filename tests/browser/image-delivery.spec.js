import { test, expect } from '../helpers/browser.js'

test('gallery delivers local fonts, WebP collage and lossless branding', async ({ page }) => {
  const externalFonts = []
  page.on('request', request => { if (/fonts\.(?:googleapis|gstatic)\.com/u.test(request.url())) externalFonts.push(request.url()) })
  await page.goto('/')
  await expect(page.locator('.species-card')).toHaveCount(36)
  await expect.poll(() => page.locator('.brand-artwork').evaluate(image => new URL(image.currentSrc).pathname)).toBe('/branding/fungarium-mark.webp')
  await expect.poll(() => page.locator('.top-nine-slide img').first().evaluate(image => new URL(image.currentSrc).pathname)).toBe('/images/fungarium-2024.webp')
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute('href', '/images/fungarium-2024.webp')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('16px "DM Sans"') && document.fonts.check('32px "Libre Caslon Display"'))).toBe(true)
  expect(externalFonts).toEqual([])
})

test('direct profiles retain readable static content while data loads and then show an eager cover', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/assets/boletus-edulis-*.js', async route => { await gate; await route.continue() })
  try {
    await page.goto('/fungi/boletus-edulis/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.seo-fallback h1')).toHaveText('Boletus edulis')
    await expect(page.locator('.seo-static-photo img')).toHaveAttribute('loading', 'eager')
    await expect(page.getByText('Opening the encyclopedia…', { exact: true })).toHaveCount(0)
  } finally { release() }
  await expect(page.locator('.species-heading h1')).toHaveText('Boletus edulis')
  const cover = page.locator('.featured-button img')
  await expect(cover).toHaveAttribute('src', /\.cover-v1\.webp$/)
  await expect(cover).toHaveAttribute('fetchpriority', 'high')
  await expect(page.locator('.seo-fallback')).toHaveCount(0)
})

test('a missing cover derivative falls back to the original and the photo viewer keeps full resolution', async ({ page }) => {
  await page.route('**/*.cover-v1.webp', route => route.abort())
  await page.goto('/fungi/boletus-edulis/')
  const image = page.locator('.featured-button img')
  await expect(image).toHaveAttribute('src', /^\/images\/posts\//)
  await expect.poll(() => image.evaluate(element => element.naturalWidth)).toBeGreaterThan(0)
  const original = await image.getAttribute('src')
  await page.locator('.featured-button').click()
  await expect(page.locator('.lightbox > img')).toHaveAttribute('src', original)
})
