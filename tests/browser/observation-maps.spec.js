import { readFile } from 'node:fs/promises'
import { test, expect } from '../helpers/browser.js'
import { parseCoordinates } from '../../src/lib/coordinates.mjs'

const content = JSON.parse(await readFile(new URL('../../src/data/posts.json', import.meta.url), 'utf8'))
const unlocated = content.species.find(item => item.observations.every(post => !parseCoordinates(post.coordinates)))
const singleLocation = content.species.find(item => {
  const positions = item.observations.map(post => parseCoordinates(post.coordinates)).filter(Boolean)
  return positions.length && new Set(positions.map(position => `${position.latitude},${position.longitude}`)).size === 1
})

async function openMap(page) {
  await page.goto('/#/fungi/boletus-edulis')
  await expect(page.locator('.species-heading h1')).toBeVisible()
  const map = page.locator('.observation-map')
  test.skip(await map.count() === 0, 'Build with a Google Maps API key to exercise embedded maps.')
  await map.scrollIntoViewIfNeeded()
  return map
}

test('one lazy species map fits every observation, survives encounter toggles, and reuses the API on navigation', async ({ page }) => {
  let requests = 0
  page.on('request', request => { if (request.url().startsWith('https://maps.googleapis.com/maps/api/js?')) requests++ })
  await page.goto('/#/fungi/boletus-edulis')
  await expect(page.locator('.species-heading h1')).toBeVisible()
  const encounters = page.locator('.encounter')
  const map = page.locator('.observation-map')
  test.skip(await map.count() === 0, 'Build with a Google Maps API key to exercise embedded maps.')
  await expect(map).toHaveCount(1)
  await expect(encounters.locator('.observation-map')).toHaveCount(0)
  await expect(map).toHaveAttribute('data-map-state', 'waiting')
  expect(requests).toBe(0)
  await map.scrollIntoViewIfNeeded()
  await expect(map).toHaveAttribute('data-map-state', 'ready')
  await expect(map.locator('figcaption')).toContainText('4 pins')
  await expect(map.locator('.observation-map-frame')).toHaveCSS('height', '300px')
  const rendered = await page.evaluate(() => window.__googleMapsTest.maps[0])
  expect(rendered.pins).toHaveLength(4)
  expect(rendered.pins[0].lat).toBeCloseTo(59.38575, 7)
  expect(rendered.pins[0].lng).toBeCloseTo(25.3962777778, 7)
  expect(rendered.pins).toContainEqual({ lat: 57.984637, lng: 27.621764 })
  expect(rendered.bounds).toEqual(rendered.pins)
  expect(rendered.padding).toBeGreaterThan(0)
  expect(rendered.titles).toHaveLength(4)
  expect(rendered.titles.every(title => title.includes(' · '))).toBe(true)
  expect(rendered.mapTypeId).toBe('terrain')

  const historical = encounters.filter({ has: page.locator('a[href="https://www.instagram.com/p/CtSIj_MsP0C/"]') })
  await historical.locator('summary').first().click()
  await historical.locator('summary').first().click()
  await encounters.first().locator('summary').first().click()
  await map.scrollIntoViewIfNeeded()
  await expect(map).toHaveAttribute('data-map-state', 'ready')
  expect(await page.evaluate(() => window.__googleMapsTest.maps.length)).toBe(1)
  expect(requests).toBe(1)
  await page.getByRole('link', { name: 'Back to the collection' }).click()
  await expect.poll(() => page.evaluate(() => window.__googleMapsTest.cleaned)).toBe(1)

  await page.getByRole('searchbox').fill(singleLocation.latinName)
  await page.getByRole('link', { name: `${singleLocation.latinName}, ${singleLocation.observations.length} observations`, exact: true }).click()
  await map.scrollIntoViewIfNeeded()
  await expect(map).toHaveAttribute('data-map-state', 'ready')
  const next = await page.evaluate(() => window.__googleMapsTest.maps[1])
  const coordinates = parseCoordinates(singleLocation.observations.find(post => parseCoordinates(post.coordinates)).coordinates)
  expect(next.center).toEqual({ lat: coordinates.latitude, lng: coordinates.longitude })
  expect(next.pins.every(pin => pin.lat === next.center.lat && pin.lng === next.center.lng)).toBe(true)
  expect(next.zoom).toBe(14)
  expect(next.bounds).toBeUndefined()
  expect(requests).toBe(1)
})

test('the map fits a narrow phone and authentication failures retain the coordinate link', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  const map = await openMap(page)
  await expect(map).toHaveAttribute('data-map-state', 'ready')
  await expect(map.locator('.observation-map-frame')).toHaveCSS('height', '260px')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => window.gm_authFailure())
  await expect(map).toHaveAttribute('data-map-state', 'error')
  await expect(map.getByRole('status')).toContainText('coordinate links in the field encounters below')
  const link = page.locator('.encounter').first().locator('.coordinates-link')
  await expect(link).toBeVisible()
  expect(new URL(await link.getAttribute('href')).searchParams.get('query')).toBe('59.3857500,25.3962778')
})

test.describe('when Google Maps cannot be reached', () => {
  test.use({ googleMapsResponse: 'network-error' })

  test('the encounter and original coordinate link remain usable', async ({ page }) => {
    const map = await openMap(page)
    await expect(map).toHaveAttribute('data-map-state', 'error')
    await expect(map.getByRole('status')).toContainText('The map is unavailable')
    await expect(page.locator('.encounter').first().locator('.coordinates-link')).toBeVisible()
    await expect(page.locator('.encounter').first().getByRole('link', { name: /Original Instagram post/ })).toBeVisible()
  })
})

test('encounters without usable coordinates do not create maps or request the API', async ({ page }) => {
  test.skip(!unlocated, 'All taxa in this corpus have at least one located encounter.')
  let requests = 0
  page.on('request', request => { if (request.url().startsWith('https://maps.googleapis.com/maps/api/js?')) requests++ })
  await page.goto(`/#/fungi/${unlocated.id}`)
  await expect(page.locator('.species-heading h1')).toBeVisible()
  await page.locator('.encounter').first().scrollIntoViewIfNeeded()
  await expect(page.locator('.observation-map')).toHaveCount(0)
  expect(requests).toBe(0)
})
