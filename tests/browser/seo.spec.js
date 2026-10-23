import { readFile } from 'node:fs/promises'
import { test, expect } from '../helpers/browser.js'

const { species } = JSON.parse(await readFile(new URL('../../src/data/posts.json', import.meta.url), 'utf8'))

test('all published species have static HTML metadata and appear at clean sitemap URLs', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/gu)].map(match => match[1])
  expect(urls).toHaveLength(species.length + 1)
  expect(new Set(urls).size).toBe(urls.length)
  expect(urls.every(url => !url.includes('#') && !url.includes('?'))).toBe(true)
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Sitemap: https://fungarium.info/sitemap.xml')
  for (const item of species) {
    const canonical = `https://fungarium.info/fungi/${item.id}/`
    expect(urls).toContain(canonical)
    const response = await request.get(`/fungi/${item.id}/`)
    expect(response.status(), item.id).toBe(200)
    const html = await response.text()
    expect(html, item.id).toContain(`rel="canonical" href="${canonical}"`)
    expect(html, item.id).toContain(`property="og:title" content="${item.latinName} — Fungarium.INFO Encyclopedia"`)
    expect(html, item.id).toContain('name="twitter:card" content="summary_large_image"')
    expect(html, item.id).toContain('id="page-structured-data"')
    expect(html, item.id).toContain('<h2>The scientific profile</h2>')
  }
})

test('species profiles and their metadata are readable without running JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4173/fungi/boletus-edulis/')
    await expect(page.getByRole('heading', { name: 'Boletus edulis', exact: true })).toBeVisible()
    await expect(page.locator('.seo-fallback')).toContainText('reticulate')
    await expect(page.getByRole('heading', { name: 'Field encounters', exact: true })).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://fungarium.info/fungi/boletus-edulis/')
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Boletus edulis — Fungarium.INFO Encyclopedia')
    const graph = JSON.parse(await page.locator('#page-structured-data').textContent())['@graph']
    expect(graph.find(node => node['@type'] === 'Taxon').name).toBe('Boletus edulis')
    await expect(page.getByRole('link', { name: '#boletusedulis', exact: true })).toHaveAttribute('href', '/?tag=boletusedulis')
  } finally { await context.close() }
})

test('client navigation updates one set of metadata and filtered collections are noindex', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.species-card')).toHaveCount(36)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://fungarium.info/')
  await page.getByLabel('Search scope').selectOption('scientific')
  await page.getByRole('searchbox').fill('Boletus edulis')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  await page.locator('.species-card-link').click()
  await expect(page).toHaveURL(/\/fungi\/boletus-edulis\/$/)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Boletus edulis — Fungarium.INFO Encyclopedia')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://fungarium.info/fungi/boletus-edulis/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow, max-image-preview:large')
  await expect(page.locator('meta[name="description"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('#page-structured-data')).toHaveCount(1)
  await page.getByRole('link', { name: 'Back to the collection', exact: true }).click()
  await expect(page).toHaveTitle('Fungarium.INFO Encyclopedia')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Fungarium.INFO Encyclopedia')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://fungarium.info/')
  const graph = JSON.parse(await page.locator('#page-structured-data').textContent())['@graph']
  expect(graph.some(node => node['@type'] === 'CollectionPage')).toBe(true)
  expect(graph.some(node => node['@type'] === 'Taxon')).toBe(false)
})

test('hashtag case variants filter consistently and all source hashtags can be expanded and collapsed', async ({ page }) => {
  await page.goto('/?tag=%23POLYPORE')
  await expect(page.locator('.species-card').first()).toBeVisible()
  await expect(page.locator('.tag-filter')).toContainText('#POLYPORE')
  const upper = await page.locator('.species-card-link').evaluateAll(links => links.map(link => link.getAttribute('href')))
  await page.goto('/?tag=polypore')
  await expect(page.locator('.species-card').first()).toBeVisible()
  expect(await page.locator('.species-card-link').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(upper)
  await page.goto('/fungi/boletus-edulis/')
  const item = species.find(record => record.id === 'boletus-edulis')
  await expect(page.locator('.hashtag-list a')).toHaveCount(Math.min(24, item.hashtags.length))
  if (item.hashtags.length > 24) {
    await page.locator('.hashtag-list button').click()
    await expect(page.locator('.hashtag-list a')).toHaveCount(item.hashtags.length)
    await expect(page.locator('.hashtag-list button')).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: 'Show fewer hashtags', exact: true }).click()
    await expect(page.locator('.hashtag-list a')).toHaveCount(24)
  }
})

test('missing profiles and failed data loads do not leave indexable or stale species metadata', async ({ page }) => {
  await page.goto('/#/fungi/not-a-real-species')
  await expect(page.getByRole('heading', { name: /isn’t in the journal/ })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  await expect(page.locator('#page-structured-data')).toHaveCount(0)
  await page.route('**/assets/boletus-edulis-*.js', route => route.abort())
  await page.goto('/fungi/boletus-edulis/')
  await expect(page.getByRole('heading', { name: 'The field notes couldn’t be loaded.', exact: true })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  await expect(page.locator('#page-structured-data')).toHaveCount(0)
  await expect(page).toHaveTitle('Field notes unavailable — Fungarium.INFO Encyclopedia')
})

test('opening an old hash bookmark from an already open clean gallery remains supported', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.species-card')).toHaveCount(36)
  await page.goto('/#/fungi/amanita-muscaria')
  await expect(page.locator('.species-heading h1')).toHaveText('Amanita muscaria')
  await expect(page).toHaveURL(/#\/fungi\/amanita-muscaria$/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://fungarium.info/fungi/amanita-muscaria/')
})
