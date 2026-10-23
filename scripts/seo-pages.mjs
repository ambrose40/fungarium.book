import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { root } from './project-paths.mjs'
import { SITE_NAME } from '../src/branding.js'
import { assetUrl } from '../src/lib/asset-urls.mjs'
import { deploymentBase, metadataElements, pageMetadata, parentSitePath, siteOrigin, speciesPath } from '../src/lib/seo.mjs'

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

export function renderMetadata(metadata) {
  return metadataElements(metadata).map(([tag, attributes, text]) => {
    const attrs = Object.entries({ 'data-seo': '', ...attributes }).map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join('')
    if (tag === 'meta' || tag === 'link') return `<${tag}${attrs} />`
    return `<${tag}${attrs}>${tag === 'script' ? text : escapeHtml(text)}</${tag}>`
  }).join('\n    ')
}

function photoHtml(photo, name, base) {
  return photo ? `<img src="${escapeHtml(assetUrl(photo.thumb || photo.src, base))}" alt="${escapeHtml(photo.alt || name)}" loading="lazy" decoding="async" />` : ''
}

export function renderStaticContent({ item = null, species, base = '/', error = '' }) {
  const home = deploymentBase(base)
  const header = `<header class="seo-static-header"><a href="${escapeHtml(home)}">${SITE_NAME}</a><a href="${escapeHtml(parentSitePath(base))}">Home</a></header>`
  const footer = `<p><a href="${escapeHtml(home)}">Back to the collection</a> · Photography and field notes by <a href="https://www.instagram.com/fungarium.info/">@fungarium.info</a></p>`
  if (error) return `<main class="container seo-fallback">${header}<h1>Species not found</h1><p>The requested species is not in the collection.</p>${footer}</main>`
  if (!item) {
    const cards = species.map(record => {
      const photo = record.observations.find(post => post.photos.length)?.photos[0]
      return `<article class="seo-static-card"><a href="${escapeHtml(speciesPath(record.id, base))}">${photoHtml(photo, record.latinName, base)}<h2><em>${escapeHtml(record.latinName)}</em></h2></a><p>${escapeHtml([record.family, record.taxonomicClass].filter(Boolean).join(' / '))}</p></article>`
    }).join('\n')
    return `<main class="container seo-fallback">${header}<h1>${SITE_NAME}</h1><p>Original photographs, latest-record scientific profiles, and field encounters for ${species.length} species and taxa.</p><noscript><p>Browse the profiles below. Interactive search and filters are available with JavaScript enabled.</p></noscript><section class="species-grid" aria-label="The collection">${cards}</section>${footer}</main>`
  }
  const photo = item.observations.find(post => post.photos.length)?.photos[0]
  const taxonomy = `<dl><dt>Scientific identification</dt><dd>${escapeHtml(item.identification)}</dd>${item.family ? `<dt>Family</dt><dd>${escapeHtml(item.family)}</dd>` : ''}${item.taxonomicClass ? `<dt>Class</dt><dd>${escapeHtml(item.taxonomicClass)}</dd>` : ''}<dt>Genus</dt><dd>${escapeHtml(item.genus)}</dd></dl>`
  const names = item.science.commonNames.map(name => `<li>${escapeHtml(name.language)}: ${escapeHtml(name.name)}</li>`).join('')
  const traits = item.science.traits.map(trait => `<section><h3>${escapeHtml(trait.label)}</h3><p>${escapeHtml(trait.text)}</p></section>`).join('')
  const references = [...new Set(item.science.references)].map(url => `<li><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`).join('')
  const observations = item.observations.map(post => `<article><h3>${escapeHtml(post.observedAt || post.date)}</h3><p>${escapeHtml(post.location || 'Location not recorded')}</p>${post.habitat ? `<p>${escapeHtml(post.habitat)}</p>` : ''}${post.coordinates ? `<p>${escapeHtml(post.coordinates)}</p>` : ''}${post.weather ? `<p>${escapeHtml(post.weather)}</p>` : ''}${post.instagramUrl ? `<a href="${escapeHtml(post.instagramUrl)}">Original Instagram post</a>` : ''}</article>`).join('')
  const hashtags = item.hashtags.map(tag => `<a href="${escapeHtml(`${home}?tag=${encodeURIComponent(tag)}`)}">#${escapeHtml(tag)}</a>`).join(' ')
  return `<main class="container seo-fallback">${header}<h1><em>${escapeHtml(item.latinName)}</em></h1>${item.commonName ? `<p>${escapeHtml(item.commonName)}</p>` : ''}<figure class="seo-static-photo">${photoHtml(photo, item.latinName, base)}</figure>${taxonomy}<section><h2>Names across languages</h2><ul>${names}</ul></section><section><h2>The scientific profile</h2><p>From the latest record: ${escapeHtml(item.scienceSource.date)}.</p>${traits || '<p>This latest caption does not include a scientific description.</p>'}${item.science.publication ? `<p>${escapeHtml(item.science.publication)}</p>` : ''}${references ? `<ul>${references}</ul>` : ''}</section><section><h2>Field encounters</h2>${observations}</section><section><h2>Source hashtags</h2><p>${hashtags || 'No hashtags recorded.'}</p></section>${footer}</main>`
}

export function renderSeoPage(template, metadata, body) {
  if (!template.includes('<!-- seo:head:start -->') || !template.includes('<!-- seo:body:start -->')) throw new Error('The HTML template is missing SEO insertion markers.')
  return template.replace(/<!-- seo:head:start -->[\s\S]*?<!-- seo:head:end -->/u, () => `<!-- seo:head:start -->\n    ${renderMetadata(metadata)}\n    <!-- seo:head:end -->`)
    .replace(/<!-- seo:body:start -->[\s\S]*?<!-- seo:body:end -->/u, () => `<!-- seo:body:start -->${body}<!-- seo:body:end -->`)
}

export function sitemapXml(species, options) {
  const pages = [pageMetadata(options).canonical, ...species.map(item => pageMetadata({ ...options, item }).canonical)]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(url => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`
}

export function seoPagesPlugin({ origin } = {}) {
  let base
  let output
  const canonicalOrigin = siteOrigin(origin)
  async function content() { return JSON.parse(await readFile(path.join(root, 'src/data/posts.json'), 'utf8')) }
  return {
    name: 'fungarium-static-seo-pages',
    enforce: 'post',
    configResolved(config) {
      base = deploymentBase(config.base)
      output = path.resolve(config.root, config.build.outDir)
    },
    async transformIndexHtml(html, context) {
      const data = await content()
      const url = new URL(context.originalUrl || context.path, canonicalOrigin)
      const relative = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname.replace(/^\//u, '')
      const match = relative.match(/^fungi\/([^/]+)\/?$/u)
      const item = match ? data.species.find(record => record.id === decodeURIComponent(match[1])) : null
      const error = match && !item ? 'not-found' : ''
      const options = { item, species: data.species, base, origin: canonicalOrigin, query: Object.fromEntries(url.searchParams), error }
      return renderSeoPage(html, pageMetadata(options), renderStaticContent(options))
    },
    async writeBundle() {
      const data = await content()
      const template = await readFile(path.join(output, 'index.html'), 'utf8')
      const options = { species: data.species, base, origin: canonicalOrigin }
      await Promise.all(data.species.map(async item => {
        const directory = path.join(output, 'fungi', item.id)
        await mkdir(directory, { recursive: true })
        await writeFile(path.join(directory, 'index.html'), renderSeoPage(template, pageMetadata({ ...options, item }), renderStaticContent({ ...options, item })))
      }))
      await writeFile(path.join(output, 'sitemap.xml'), sitemapXml(data.species, options))
      const sitemap = new URL(`${base}sitemap.xml`, canonicalOrigin).href
      await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: ${base}\nSitemap: ${sitemap}\n`)
      console.info(`SEO: generated ${data.species.length} species HTML pages, sitemap.xml, and robots.txt.`)
    },
  }
}
