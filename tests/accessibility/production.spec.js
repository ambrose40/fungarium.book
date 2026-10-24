import { writeFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '../helpers/browser.js'
import { composite, contrastRatio, parseColor } from '../helpers/contrast.mjs'

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

async function audit(page, name, testInfo) {
  const result = await new AxeBuilder({ page }).withTags(tags).options({ rules: { 'target-size': { enabled: true } } }).analyze()
  await writeFile(testInfo.outputPath(`${name}-axe.json`), JSON.stringify(result, null, 2))
  const findings = result.violations.map(issue => ({ id: issue.id, impact: issue.impact, targets: issue.nodes.map(node => node.target) }))
  await writeFile(testInfo.outputPath(`${name}-summary.json`), JSON.stringify({
    violations: findings,
    incomplete: result.incomplete.map(issue => ({ id: issue.id, nodes: issue.nodes.length })),
  }, null, 2))
  expect(findings, `${name}: ${JSON.stringify(findings)}`).toEqual([])
  return result
}

async function openFilters(page) {
  const toggle = page.getByRole('button', { name: /^Filters/ })
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
}

async function expectFocusVisible(page, locator) {
  await expect(locator).toBeFocused()
  const bounds = await locator.boundingBox()
  const header = await page.locator('.site-header').boundingBox()
  expect(bounds.y).toBeGreaterThanOrEqual(header.y + header.height - 1)
  expect(bounds.y).toBeLessThan((await page.viewportSize()).height)
}

async function assertTextContrast(locator, minimum = 4.5) {
  const colors = await locator.evaluate(element => {
    const backgrounds = []
    let node = element
    while (node) {
      const style = getComputedStyle(node)
      backgrounds.push(style.backgroundColor)
      if (style.backgroundColor.startsWith('rgb(')) break
      node = node.parentElement
    }
    return { foreground: getComputedStyle(element).color, backgrounds }
  })
  let background = [255, 255, 255, 1]
  for (const color of colors.backgrounds.reverse()) background = composite(parseColor(color), background)
  const foreground = composite(parseColor(colors.foreground), background)
  const ratio = contrastRatio(foreground, background)
  expect(ratio, `Contrast ${colors.foreground} on ${JSON.stringify(background)} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimum)
  return ratio
}

async function assertPhotoLabelContrast(locator, backplate) {
  const colors = await locator.evaluate((element, selector) => ({
    foreground: getComputedStyle(element).color,
    background: getComputedStyle(element.closest(selector)).backgroundColor,
  }), backplate)
  // White is the brightest possible photo pixel; don't credit gradients or shadows.
  const background = composite(parseColor(colors.background), [255, 255, 255, 1])
  const ratio = contrastRatio(composite(parseColor(colors.foreground), background), background)
  expect(ratio, `Worst-case photo contrast for ${colors.foreground} on ${colors.background}`).toBeGreaterThanOrEqual(4.5)
  return ratio
}

test('axe audits the gallery, expanded/selected filters, and empty results', async ({ page }, testInfo) => {
  await page.goto('./')
  await expect(page.locator('.species-card')).toHaveCount(36)
  await audit(page, 'gallery', testInfo)
  await page.goto('./?genus=Boletus&sc.stipe=reticulate&mc.hymenium=pores')
  await openFilters(page)
  await page.locator('.scientific-text-search > summary').click()
  await page.locator('[data-characteristic-filter="hymenium"] > summary').click()
  await audit(page, 'selected-filters', testInfo)
  await page.getByRole('searchbox').fill('no-recorded-fungus-matches-this')
  await expect(page.getByText('No discoveries here just yet.')).toBeVisible()
  await audit(page, 'empty-results', testInfo)
})

test('axe audits profiles, expanded evidence/captions, and named dialogs', async ({ page }, testInfo) => {
  await page.goto('./fungi/boletus-edulis/')
  await expect(page.locator('.species-heading h1')).toBeVisible()
  await page.locator('[data-characteristic="cap"] > summary').click()
  await page.locator('.encounter').first().locator('.original-caption > summary').click()
  await audit(page, 'profile', testInfo)
  await page.locator('.featured-button').click()
  await expect(page.getByRole('dialog', { name: 'Photographs of Boletus edulis', exact: true })).toBeVisible()
  await audit(page, 'lightbox', testInfo)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'About the journal', exact: true }).click()
  await expect(page.getByRole('dialog', { name: /Fungarium.INFO/ })).toBeVisible()
  await audit(page, 'about-dialog', testInfo)
})

test('field-guide reactions, dye evidence, and season/month graphics remain accessible', async ({ page }, testInfo) => {
  for (const [id, category] of [['hydnellum-peckii', 'exudates'], ['cortinarius-sanguineus', 'uses'], ['coprinus-comatus', 'maturation'], ['stropharia-caerulea', 'seasonality']]) {
    await page.goto(`./fungi/${id}/`)
    const summary = page.locator(`[data-characteristic="${category}"] > summary`)
    await summary.focus()
    await page.keyboard.press('Enter')
    await expect(summary).toBeFocused()
    await expect(summary.locator('..')).toHaveAttribute('open', '')
    await audit(page, `field-guide-${id}`, testInfo)
  }
  const timeline = page.locator('[data-characteristic="seasonality"]')
  await expect(timeline.getByRole('img', { name: /July.*November/ })).toBeVisible()
  await assertTextContrast(timeline.locator('.mycology-season.is-active').first())
  await assertTextContrast(timeline.locator('.mycology-season:not(.is-active)').first())
  await page.setViewportSize({ width: 320, height: 800 })
  await page.addStyleTag({ content: '#app *:not(svg):not(svg *){line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.emulateMedia({ forcedColors: 'active' })
  await expect(timeline.locator('.mycology-season.is-active').first()).toHaveCSS('text-decoration-line', 'underline')
})

test('skip links, route changes, and detail section links move focus below the sticky header', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.species-card')).toHaveCount(36)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expectFocusVisible(page, page.locator('#hero-title'))
  const species = page.locator('.species-card-link').first()
  await species.focus()
  await page.keyboard.press('Enter')
  await expectFocusVisible(page, page.locator('.species-heading h1'))
  const section = page.getByRole('link', { name: 'Scientific profile', exact: true })
  await section.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#scientific-profile')).toBeFocused()
  await expect(page.locator('#scientific-profile')).toBeInViewport()
})

test('query edits retain focus, removable filters have a focus destination, and new photos receive focus', async ({ page }) => {
  await page.goto('./?scope=scientific')
  const search = page.getByRole('searchbox')
  await search.fill('boletus')
  await expect(search).toBeFocused()
  await expect(page.locator('#catalog-result-count')).toHaveAttribute('role', 'status')
  await expect(page.locator('#catalog-result-count button')).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(search).toBeFocused()
  await openFilters(page)
  await page.getByLabel('Filter by family').selectOption('Boletaceae')
  await page.getByRole('button', { name: 'Remove family filter', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeFocused()
  await page.getByRole('link', { name: 'Skip taxonomic quick links', exact: true }).click()
  await expect(page.locator('.scientific-text-search > summary')).toBeFocused()
  await page.getByRole('button', { name: /^Show 327 species/ }).click()
  const more = page.getByRole('button', { name: 'More discoveries', exact: true })
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.species-card')).toHaveCount(72)
  await expectFocusVisible(page, page.locator('.species-card-link').nth(36))
  await expect(page.getByRole('status').filter({ hasText: 'Showing 72 of 327' })).toHaveCount(1)
})

test('mobile navigation and modal dialogs support Escape, focus containment, and return focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  const menu = page.getByRole('button', { name: 'Toggle navigation', exact: true })
  await menu.focus()
  await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await menu.click()
  await page.getByRole('button', { name: 'About the journal', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /Fungarium.INFO/ })
  for (let index = 0; index < 9; index++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(dialog).not.toBeVisible()
  await page.goto('./fungi/boletus-edulis/')
  const trigger = page.locator('.featured-button')
  await trigger.focus()
  await page.keyboard.press('Enter')
  const lightbox = page.getByRole('dialog', { name: 'Photographs of Boletus edulis', exact: true })
  await expect(lightbox).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#lightbox-position')).toContainText('Photograph 2 of')
  await page.keyboard.press('Shift+Tab')
  expect(await lightbox.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('photo labels, secondary text, primary buttons, and input boundaries meet measured contrast thresholds', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('.species-card')).toHaveCount(36)
  const ratios = {}
  for (const selector of ['.hero-description', '.hero-stats span', '.hero-photo figcaption span', '.photo-side-note', '.top-nine-years button.selected', '.footer-credit']) {
    ratios[selector] = await assertTextContrast(page.locator(selector).first())
  }
  for (const [selector, backplate] of [['.card-caption em', '.card-caption > span'], ['.card-caption small', '.card-caption > span'], ['.card-family', '.card-taxonomy'], ['.card-class', '.card-taxonomy'], ['.card-count', '.card-count']]) {
    ratios[`${selector} (white photo)`] = await assertPhotoLabelContrast(page.locator(selector).first(), backplate)
  }
  const card = page.locator('.species-card-link').first()
  await card.focus()
  const indicator = await card.evaluate(element => ({ border: getComputedStyle(element, '::after').borderTopColor, shadow: getComputedStyle(element, '::after').boxShadow }))
  expect(indicator.shadow).toContain('rgb(9, 9, 9)')
  ratios.photoFocusIndicator = contrastRatio(parseColor(indicator.border), parseColor('#090909'))
  expect(ratios.photoFocusIndicator).toBeGreaterThanOrEqual(3)
  await openFilters(page)
  const button = page.getByRole('button', { name: /^Show 327 species/ })
  ratios.primaryButton = await assertTextContrast(button)
  await button.hover()
  ratios.primaryButtonHover = await assertTextContrast(button)
  const input = page.locator('.taxonomy-find').first()
  const colors = await input.evaluate(element => ({ border: getComputedStyle(element).borderTopColor, background: getComputedStyle(element).backgroundColor }))
  ratios.inputBoundary = contrastRatio(parseColor(colors.border), parseColor(colors.background))
  expect(ratios.inputBoundary).toBeGreaterThanOrEqual(3)
  await page.locator('[data-characteristic-filter="hymenium"] > summary').click()
  const labels = page.locator('[data-characteristic-filter="hymenium"] .characteristic-option > span')
  for (let index = 0; index < await labels.count(); index++) await assertTextContrast(labels.nth(index))
  ratios.characteristicCount = await assertTextContrast(page.locator('[data-characteristic-filter="hymenium"] .characteristic-option > small').first())
  await writeFile(testInfo.outputPath('contrast-ratios.json'), JSON.stringify(ratios, null, 2))
})

test('200% zoom, 320 CSS-pixel reflow, and WCAG text spacing preserve content and controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1024 })
  await page.goto('./')
  await expect(page.locator('.species-card')).toHaveCount(36)
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => { document.documentElement.style.zoom = '' })
  await page.setViewportSize({ width: 320, height: 256 })
  await openFilters(page)
  await page.locator('.scientific-text-search > summary').click()
  await page.addStyleTag({ content: 'p{margin-bottom:2em!important} #app *:not(svg):not(svg *){line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: /^Show 327 species/ }).click()
  await expect(page.locator('.species-card-link').first()).toBeVisible()
  await page.goto('./fungi/amanita-muscaria/')
  await expect(page.locator('.species-heading h1')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await audit(page, 'reflow-profile', testInfo)
})

test('reduced motion and programmatic accessibility names/states are exposed in the browser tree', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./?organisms=fungi')
  await expect(page.getByRole('button', { name: 'Play TopNine slideshow', exact: true })).toBeVisible()
  await openFilters(page)
  await expect(page.getByRole('checkbox', { name: 'Show fungi', exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Show slime moulds', exact: true })).not.toBeChecked()
  const snapshot = await page.locator('#main').ariaSnapshot()
  expect(snapshot).toContain('checkbox "Show fungi" [checked]')
  expect(snapshot).toContain('status:')
  expect(snapshot).toContain('list:')
  await writeFile(testInfo.outputPath('accessibility-tree.txt'), snapshot)
  await expect(page.locator('.alphabet button').first()).toHaveAttribute('aria-pressed', 'true')
})

test('standalone controls meet target minimums and language annotations preserve source captions', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('./?family=Boletaceae')
  await openFilters(page)
  for (const selector of ['.mobile-menu', '.filter-toggle', '.tag-filter button', '.organism-filters input', '.alphabet button', '.card-taxonomy a']) {
    for (const element of await page.locator(selector).all()) {
      const bounds = await element.boundingBox()
      if (!bounds) continue
      expect(bounds.width, selector).toBeGreaterThanOrEqual(24)
      expect(bounds.height, selector).toBeGreaterThanOrEqual(24)
    }
  }
  await page.goto('./fungi/boletus-edulis/')
  await expect(page.locator('.language-list [lang="et"]')).toBeVisible()
  await expect(page.locator('.language-list [lang="ru"]')).toBeVisible()
  const caption = page.locator('.encounter').first().locator('.original-caption')
  await caption.locator('summary').click()
  await expect(caption.locator('[lang="et"]')).toContainText('🇪🇪')
  await expect(caption.locator('[lang="ru"]')).toContainText('🇷🇺')
})

test('static profiles retain a native skip link and reading landmarks without application JavaScript', async ({ page }, testInfo) => {
  await page.route('**/assets/*.js', route => route.abort())
  await page.goto('./fungi/boletus-edulis/')
  await expect(page.locator('.seo-fallback')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
  await audit(page, 'static-profile', testInfo)
})

test('mobile pages and forced-colour focus/selected states remain operable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('./')
  await expect(page.locator('.species-card')).toHaveCount(36)
  const longNameCard = page.locator('.species-card').filter({ hasText: 'Asterophora lycoperdoides' })
  await longNameCard.scrollIntoViewIfNeeded()
  const photo = await longNameCard.locator('.media-frame').boundingBox()
  const caption = await longNameCard.locator('.card-caption').boundingBox()
  const taxonomy = await longNameCard.locator('.card-taxonomy').boundingBox()
  expect(photo.width / photo.height).toBeCloseTo(1.5, 1)
  expect(caption.y).toBeGreaterThanOrEqual(photo.y + photo.height - 1)
  expect(caption.y).toBeGreaterThanOrEqual(taxonomy.y + taxonomy.height)
  await page.screenshot({ path: testInfo.outputPath('mobile-long-name.png') })
  await page.evaluate(() => window.scrollTo(0, 0))
  await audit(page, 'mobile-gallery', testInfo)
  await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click()
  await audit(page, 'mobile-navigation', testInfo)
  await page.keyboard.press('Escape')
  await page.emulateMedia({ forcedColors: 'active' })
  await page.getByRole('button', { name: 'Toggle navigation', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Toggle navigation', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await openFilters(page)
  const all = page.locator('.alphabet button').first()
  await page.keyboard.press('Tab')
  await all.focus()
  await expect(all).toHaveAttribute('aria-pressed', 'true')
  await expect(all).toHaveCSS('text-decoration-line', 'underline')
  await expect(all).toHaveCSS('outline-style', 'solid')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
