import { SITE_NAME, BRAND_MARK_PATH } from '../branding.js'
import { scientificText } from './scientific-search.mjs'
import { uniqueHashtags } from './hashtags.mjs'

export const DEFAULT_SITE_ORIGIN = 'https://fungarium.info'
export const SITE_DESCRIPTION = 'Fungi and slime-mould photography, scientific profiles, multilingual names, and original field encounters by @fungarium.info.'
export const SOCIAL_IMAGE_PATH = '/images/fungarium-2024.jpeg'

export function siteOrigin(value = DEFAULT_SITE_ORIGIN) {
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('SITE_ORIGIN must be an HTTP(S) origin without a path, query, or credentials.')
  return url.origin
}

export function deploymentBase(base = '/') {
  if (!base.startsWith('/') || base.startsWith('//') || /[?#]/u.test(base)) throw new Error('SEO pages require an absolute deployment base such as / or /encyclopedia/.')
  return `${base.replace(/\/+$/u, '')}/`
}

export function speciesPath(id, base = '/') {
  return `${deploymentBase(base)}fungi/${encodeURIComponent(id)}/`
}

export function parentSitePath(base = '/') {
  return new URL('../', `https://example.invalid${deploymentBase(base)}`).pathname
}

export function publicAssetUrl(path, { base = '/', origin = DEFAULT_SITE_ORIGIN } = {}) {
  if (/^https?:\/\//iu.test(path)) return new URL(path).href
  return new URL(`${deploymentBase(base)}${path.replace(/^\/+|^\.\//u, '')}`, siteOrigin(origin)).href
}

function excerpt(value, limit = 165) {
  const text = String(value || '').replace(/\s+/gu, ' ').trim()
  if (text.length <= limit) return text
  const shortened = text.slice(0, limit - 1)
  return `${shortened.replace(/\s+\S*$/u, '') || shortened}…`
}

function cover(item) { return item?.observations?.find(post => post.photos?.length)?.photos[0] }

export function speciesDescription(item) {
  const overview = scientificText(item).overview
  if (overview) return excerpt(overview.toLowerCase().startsWith(item.latinName.toLowerCase()) ? overview : `${item.latinName}: ${overview}`)
  const name = item.commonName ? `${item.latinName} (${item.commonName})` : item.latinName
  return excerpt(`${name}: original photographs and recorded field encounters${item.family ? ` in the family ${item.family}` : ''}. Explore the scientific profile on ${SITE_NAME}.`)
}

export function pageMetadata({ item = null, species = [], base = '/', origin = DEFAULT_SITE_ORIGIN, query = {}, error = '' } = {}) {
  const root = new URL(deploymentBase(base), siteOrigin(origin)).href
  const canonical = item ? new URL(speciesPath(item.id, base), siteOrigin(origin)).href : root
  const filterKeys = new Set(['q', 'scope', 'genus', 'family', 'class', 'organisms', 'year', 'letter', 'tag', 'sort'])
  const filtered = !item && Object.entries(query).some(([key, value]) =>
    (filterKeys.has(key) || key.startsWith('mc.') || key.startsWith('sc.')) &&
    (Array.isArray(value) ? value.some(entry => entry !== null && entry !== '') : value !== undefined && value !== null && value !== ''))
  const title = error === 'not-found' ? `Species not found — ${SITE_NAME}` : error ? `Field notes unavailable — ${SITE_NAME}` : item ? `${item.latinName} — ${SITE_NAME}` : SITE_NAME
  const description = error ? 'The requested field notes are unavailable. Explore the collection of recorded fungi and slime moulds.' : item ? speciesDescription(item) : SITE_DESCRIPTION
  const photo = cover(item)
  const image = publicAssetUrl(photo?.src || SOCIAL_IMAGE_PATH, { base, origin })
  const imageAlt = photo?.alt || (item ? `Photograph of ${item.latinName}` : 'A collection of original fungi photographs by @fungarium.info')
  const tags = uniqueHashtags(item?.hashtags || [])
  const robots = filtered || error ? 'noindex, follow' : 'index, follow, max-image-preview:large'
  const websiteId = `${root}#website`
  const pageId = `${canonical}#webpage`
  const author = { '@type': 'Person', name: '@fungarium.info', url: 'https://www.instagram.com/fungarium.info/' }
  const publisher = { '@type': 'Organization', name: 'Fungarium.INFO', url: `${siteOrigin(origin)}/`, logo: { '@type': 'ImageObject', url: publicAssetUrl(BRAND_MARK_PATH, { base, origin }) } }
  const graph = [
    { '@type': 'WebSite', '@id': websiteId, name: SITE_NAME, url: root, inLanguage: 'en', publisher },
    { '@type': item ? 'WebPage' : 'CollectionPage', '@id': pageId, name: title, description, url: canonical, inLanguage: 'en', isPartOf: { '@id': websiteId }, publisher, author },
  ]
  if (!error) {
    graph[1].primaryImageOfPage = { '@id': `${canonical}#primaryimage` }
    graph.push({ '@type': 'ImageObject', '@id': `${canonical}#primaryimage`, contentUrl: image, caption: imageAlt, creator: author })
    if (item) {
      const taxon = { '@type': 'Taxon', '@id': `${canonical}#taxon`, name: item.latinName, alternateName: [...new Set((item.science?.commonNames || []).map(name => name.name))] }
      if (item.family) taxon.parentTaxon = { '@type': 'Taxon', name: item.family, taxonRank: 'family' }
      if (item.science?.gbifUrl) taxon.sameAs = item.science.gbifUrl
      graph[1].mainEntity = { '@id': taxon['@id'] }
      if (tags.length) graph[1].keywords = tags.join(', ')
      graph.push(taxon, { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumbs`, itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'The collection', item: root },
        { '@type': 'ListItem', position: 2, name: item.latinName, item: canonical },
      ] })
      graph[1].breadcrumb = { '@id': `${canonical}#breadcrumbs` }
    } else if (!filtered) {
      graph[1].mainEntity = { '@type': 'ItemList', numberOfItems: species.length, itemListElement: species.map((record, index) => ({ '@type': 'ListItem', position: index + 1, name: record.latinName, url: new URL(speciesPath(record.id, base), siteOrigin(origin)).href })) }
    }
  }
  return { title, description, canonical, image, imageAlt, robots, tags, type: item && !error ? 'article' : 'website', structuredData: error ? null : { '@context': 'https://schema.org', '@graph': graph } }
}

export function metadataElements(metadata) {
  const elements = [
    ['title', {}, metadata.title],
    ['meta', { name: 'description', content: metadata.description }],
    ['meta', { name: 'robots', content: metadata.robots }],
    ['meta', { name: 'author', content: '@fungarium.info' }],
    ['meta', { name: 'application-name', content: SITE_NAME }],
    ['link', { rel: 'canonical', href: metadata.canonical }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:type', content: metadata.type }],
    ['meta', { property: 'og:title', content: metadata.title }],
    ['meta', { property: 'og:description', content: metadata.description }],
    ['meta', { property: 'og:url', content: metadata.canonical }],
    ['meta', { property: 'og:image', content: metadata.image }],
    ['meta', { property: 'og:image:alt', content: metadata.imageAlt }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: metadata.title }],
    ['meta', { name: 'twitter:description', content: metadata.description }],
    ['meta', { name: 'twitter:image', content: metadata.image }],
    ['meta', { name: 'twitter:image:alt', content: metadata.imageAlt }],
  ]
  if (metadata.tags.length) elements.push(['meta', { name: 'keywords', content: metadata.tags.join(', ') }])
  if (metadata.structuredData) elements.push(['script', { type: 'application/ld+json', id: 'page-structured-data' }, safeJson(metadata.structuredData)])
  return elements
}

export function safeJson(value) {
  return JSON.stringify(value).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029')
}

export function applyPageMetadata(metadata) {
  for (const element of document.head.querySelectorAll('[data-seo]')) element.remove()
  for (const [tag, attributes, text] of metadataElements(metadata)) {
    const element = document.createElement(tag)
    element.setAttribute('data-seo', '')
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
    if (text !== undefined) element.textContent = text
    document.head.append(element)
  }
}
