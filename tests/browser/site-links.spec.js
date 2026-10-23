import { test, expect } from '../helpers/browser.js'

const projects = [
  ['AzrvanAkaranA', 'https://azrvanakarana.me/'],
  ['travel-pics.vip', 'https://travel-pics.vip/'],
  ['herbarium.info', 'https://herbarium.info/'],
  ['fungarium.info', 'https://fungarium.info/'],
  ['algaerium.info', 'https://algaerium.herbarium.info/'],
  ['lichenarium.info', 'https://lichenarium.herbarium.info/'],
  ['plantarium.info', 'https://herbarium.info/plantarium'],
]

test('Home targets the parent directory and the main website and project destinations are explicit', async ({ page }) => {
  await page.goto('/#/?genus=Amanita&mc.spore-print=white')
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(navigation.getByRole('link', { name: 'Fungarium.INFO main website', exact: true })).toHaveAttribute('href', 'https://fungarium.info/')
  await expect(navigation.getByRole('link', { name: 'Instagram — @fungarium.info', exact: true })).toHaveAttribute('href', 'https://www.instagram.com/fungarium.info/')
  await expect(navigation.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href', '../')
  const footer = page.getByRole('navigation', { name: 'Other projects' })
  await expect(page.getByRole('heading', { name: 'My other projects', exact: true })).toBeVisible()
  await expect(footer.getByRole('link')).toHaveCount(7)
  for (const [name, url] of projects) {
    const link = footer.getByRole('link', { name, exact: true })
    await expect(link).toHaveAttribute('href', url)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
})

test('expanded navigation and project links fit tablet and mobile layouts', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Toggle navigation' })
  await expect(toggle).toBeVisible()
  await toggle.click()
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(navigation.getByRole('link', { name: 'Fungarium.INFO main website', exact: true })).toBeVisible()
  await navigation.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(navigation).not.toBeVisible()
  for (const width of [900, 390, 320]) {
    await page.setViewportSize({ width, height: 850 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('navigation', { name: 'Other projects' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('navigation', { name: 'Other projects' }).getByRole('link', { name: 'plantarium.info', exact: true })).toBeVisible()
  await page.locator('.site-footer').screenshot({ path: 'test-results/other-projects-mobile.png' })
})
