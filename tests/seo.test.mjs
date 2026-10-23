import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pageMetadata, publicAssetUrl, safeJson, siteOrigin, speciesPath, parentSitePath } from '../src/lib/seo.mjs'
import { renderMetadata, renderSeoPage, renderStaticContent, sitemapXml } from '../scripts/seo-pages.mjs'
import { metadataAudit } from '../scripts/audit-metadata.mjs'

const full = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'))
const compact = JSON.parse(await readFile(new URL('../src/data/index.json', import.meta.url), 'utf8'))

test('canonical and social URLs use the configured origin and deployment base, without hash fragments', () => {
  const item = full.species.find(record => record.id === 'boletus-edulis')
  const metadata = pageMetadata({ item, base: '/encyclopedia/' })
  assert.equal(metadata.canonical, 'https://fungarium.info/encyclopedia/fungi/boletus-edulis/')
  assert.match(metadata.image, /^https:\/\/fungarium.info\/encyclopedia\/images\/posts\//)
  assert.equal(metadata.title, 'Boletus edulis — Fungarium.INFO Encyclopedia')
  assert.ok(metadata.description.length <= 165)
  assert.ok(metadata.description.includes('Boletus edulis'))
  assert.equal(metadata.robots, 'index, follow, max-image-preview:large')
  assert.equal(speciesPath(item.id), '/fungi/boletus-edulis/')
  assert.equal(parentSitePath('/encyclopedia/'), '/')
  assert.equal(parentSitePath('/book/encyclopedia/'), '/book/')
  assert.equal(pageMetadata({ base: '/encyclopedia/', origin: 'https://example.org' }).canonical, 'https://example.org/encyclopedia/')
  assert.equal(publicAssetUrl('https://images.example.org/fungus.jpg'), 'https://images.example.org/fungus.jpg')
  assert.throws(() => siteOrigin('https://example.org/path'), /SITE_ORIGIN/)
  assert.throws(() => siteOrigin('https://user:password@example.org'), /SITE_ORIGIN/)
})

test('static and client species metadata agree and structured data uses recorded names and references', () => {
  for (const item of full.species) {
    const indexed = compact.species.find(record => record.id === item.id)
    assert.deepEqual(pageMetadata({ item: indexed, base: '/encyclopedia/' }), pageMetadata({ item, base: '/encyclopedia/' }), item.id)
  }
  const item = full.species.find(record => record.id === 'boletus-edulis')
  const graph = pageMetadata({ item }).structuredData['@graph']
  const taxon = graph.find(node => node['@type'] === 'Taxon')
  assert.equal(taxon.name, item.latinName)
  assert.equal(taxon.sameAs, item.science.gbifUrl)
  assert.equal(taxon.parentTaxon.name, item.family)
  assert.ok(graph.some(node => node['@type'] === 'BreadcrumbList'))
  assert.ok(graph.some(node => node['@type'] === 'ImageObject'))
})

test('filtered pages and errors are noindex, and omitted descriptions use a factual fallback', () => {
  const item = full.species.find(record => record.id === 'trametes-hirsuta')
  const metadata = pageMetadata({ item })
  const filtered = pageMetadata({ species: full.species, query: { tag: 'polypore' } })
  assert.equal(filtered.robots, 'noindex, follow')
  assert.equal(filtered.structuredData['@graph'].find(node => node['@type'] === 'CollectionPage').mainEntity, undefined)
  assert.equal(pageMetadata({ item, query: { utm_source: 'shared' } }).robots, 'index, follow, max-image-preview:large')
  assert.equal(pageMetadata({ query: { utm_source: 'shared' } }).robots, 'index, follow, max-image-preview:large')
  assert.ok(metadata.description.includes(item.latinName))
  assert.ok(metadata.description.includes('field encounters'))
  const missing = pageMetadata({ error: 'not-found' })
  assert.equal(missing.robots, 'noindex, follow')
  assert.equal(missing.structuredData, null)
  const failed = pageMetadata({ item, error: 'load-error' })
  assert.equal(failed.robots, 'noindex, follow')
  assert.equal(failed.structuredData, null)
})

test('metadata escapes source content and static HTML contains scientific content and crawlable links', () => {
  const malicious = { ...full.species[0], latinName: 'Example <script>alert("x")</script>', science: { ...full.species[0].science, searchText: { overview: 'A "><script>injected</script> description' } } }
  const metadata = pageMetadata({ item: malicious })
  const head = renderMetadata(metadata)
  assert.ok(head.includes('&lt;script&gt;'))
  assert.ok(!head.includes('<script>injected</script>'))
  assert.ok(!safeJson({ text: '</script><script>bad</script>' }).includes('</script>'))
  assert.deepEqual(JSON.parse(safeJson({ text: '</script>' })), { text: '</script>' })
  const item = full.species.find(record => record.id === 'boletus-edulis')
  const body = renderStaticContent({ item, species: full.species, base: '/encyclopedia/' })
  assert.ok(body.includes('The scientific profile'))
  assert.ok(body.includes('reticulate'))
  assert.ok(body.includes('Field encounters'))
  assert.ok(body.includes('/encyclopedia/?tag=boletusedulis'))
  const template = '<head><!-- seo:head:start --><!-- seo:head:end --></head><div id="app"><!-- seo:body:start --><!-- seo:body:end --></div>'
  assert.ok(renderSeoPage(template, pageMetadata({ item }), body).includes('rel="canonical"'))
  const sitemap = sitemapXml(full.species, { base: '/encyclopedia/' })
  assert.equal((sitemap.match(/<loc>/gu) || []).length, full.species.length + 1)
  assert.ok(!sitemap.includes('#'))
})

test('the metadata audit identifies genuine source omissions without filling them from older records', () => {
  const audit = metadataAudit(full)
  assert.equal(audit.speciesCount, full.species.length)
  assert.equal(audit.observationCount, full.metadata.postCount)
  assert.deepEqual(audit.hashtags.observationsWithoutHashtags, [])
  assert.ok(audit.missingProfileFields.overview.some(item => item.id === 'trametes-hirsuta'))
  assert.ok(audit.hashtags.caseVariants.some(item => item.normalized === 'polypore'))
})
