import { extractHashtags, uniqueHashtags } from '../src/lib/hashtags.mjs'

export const isFungiCaption = caption => /^\s*🆔\s+\S/mu.test(caption) && !/^\s*🌸\s/mu.test(caption)
const clean = value => value.replace(/^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\uFE0F\u200D\s])+/u, '').replace(/^[^\p{L}\p{N}]+/u, '').trim()
const photographyMarker = /^(?:📷|📸|🔭|🎞|🎨|🖼|📚|🔦|💡|👋|🔎|📶|⏯|📕|📗|📘|⚙|🏎)/u
const photoCountLine = line => /\b(?:photos?|images?|views?)\b/iu.test(line) && /^(?:📖|📚|📸|📕|📗|📘)/u.test(line)
const weatherMarker = /^(?:🌡|🔆|☀|🌤|🌥|⛅|🌦|🌧|🌨|❄|☁|⛈)/u
const languageNames = { '🇺🇸': 'English', '🇬🇧': 'English', '🇩🇪': 'German', '🇫🇮': 'Finnish', '🇪🇪': 'Estonian', '🇷🇺': 'Russian', '🇫🇷': 'French', '🇪🇸': 'Spanish', '🇮🇹': 'Italian', '🇯🇵': 'Japanese', '🇨🇳': 'Chinese', '🇵🇱': 'Polish' }

export function scientificName(identification) {
  return identification.match(/^([A-Z][a-z]+(?:\s+[a-z-]+\.?)?(?:\s+(?:var\.|f\.|subsp\.)\s+[a-z-]+)?)/u)?.[1] || identification
}
export const speciesId = name => name.toLowerCase().replace(/\./g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function trait(line) {
  const text = clean(line)
  const colon = text.match(/^([^:]{2,35}):\s*(.+)$/u)
  if (colon && /^(?:ℹ|🚫|❌)/u.test(line)) return { label: colon[1], text: colon[2], raw: line }
  const rules = [
    [/^(?:🔬)/u, 'Microscopy'], [/^(?:🔤)/u, 'Overview'], [/^(?:🧪)/u, 'Chemical reactions'],
    [/^(?:🔪)/u, 'Flesh'], [/^(?:👃)/u, 'Odour'], [/^(?:👅)/u, 'Taste'],
    [/^(?:📏)/u, 'Fruit body'], [/^(?:📐)/u, 'Dimensions'], [/^(?:🏥|⚕)/u, 'Uses & compounds'],
    [/spore (?:print|color|colour)/iu, 'Spore print'], [/hymenium attachment/iu, 'Hymenium attachment'],
    [/^(?:[ℹ️🚫\s]*)\b(?:cap|no distinct cap)/iu, 'Cap'], [/\bstipe\b|lacks a stripe/iu, 'Stipe'],
    [/\bhymenium\b/iu, 'Hymenium'],
    [/^(?:🌲|🌳|🍂|🍃|🪵|🌿|🌾|🌱|🌷|🍄|⛲|🏞|🧂)|\becology\b/iu, 'Ecology'],
    [/edib|poison|toxic|consum|culinary|prized|not recommended/iu, 'Edibility'],
  ]
  return { label: rules.find(([pattern]) => pattern.test(line))?.[1] || 'Description', text, raw: line }
}

export function parseCaption(caption, { shortcode, date = '', sourceFile = null, photos = [], timestamp = null, source = 'local-caption', filenameSpecies = '' } = {}) {
  const lines = caption.split(/\r?\n/).map(line => line.trim())
  const idLines = lines.flatMap((line, index) => /^🆔\s/u.test(line) ? [index] : [])
  if (!idLines.length) return null
  // Some older files contain a revised second scientific block: use its final identification.
  const lastId = idLines.at(-1)
  const identification = lines[lastId].replace(/^🆔\s+/u, '').trim()
  const latinName = scientificName(identification)
  const get = marker => lines.find(line => line.startsWith(marker))?.slice(marker.length).replace(/^\uFE0F/u, '').trim() || ''
  const taxonomyLine = lines.find(line => /^(?:🍄|🦠)\s/u.test(line) && line.includes('/')) || ''
  const taxonomy = clean(taxonomyLine).split('/').map(value => value.trim()).filter(Boolean)
  const hashtags = extractHashtags(caption)
  const start = lines.findIndex((line, index) => index > lastId && /^(?:ℹ|🚫|❌)/u.test(line))
  const endIndex = start < 0 ? -1 : lines.findIndex((line, index) => index > start && photographyMarker.test(line))
  const end = endIndex < 0 ? lines.length : endIndex
  const scienceLines = start < 0 ? [] : lines.slice(start, end).filter(line => line && !/^(?:🆔|🌐|🧾|📖|📜|#)/u.test(line))
  const traits = scienceLines.map(trait)
  const commonNames = lines.flatMap(line => {
    const match = line.match(/^(\p{Regional_Indicator}{2})\s*(.+)$/u)
    return match ? [{ flag: match[1], language: languageNames[match[1]] || match[1], name: match[2] }] : []
  })
  const references = lines.filter(line => /^(?:🌐|🧾)/u.test(line)).flatMap(line => line.match(/https?:\/\/\S+/gu) || [])
  const gbifUrl = references.find(url => /^https:\/\/(?:www\.)?gbif\.org\//u.test(url)) || ''
  const publication = lines.filter(line => /^(?:📖|📜)/u.test(line) && !photoCountLine(line)).map(clean).join('\n')
  const dateIndex = lines.findIndex(line => line.startsWith('🗓'))
  const fieldEnd = lines.findIndex((line, index) => index > dateIndex && (/^(?:ℹ|🚫|❌)/u.test(line) || photographyMarker.test(line)))
  const habitat = lines.slice(dateIndex + 1, fieldEnd < 0 ? dateIndex + 1 : fieldEnd).filter(line =>
    line && line !== taxonomyLine && !/^(?:🌎|🌍|📌|🆔|🌐|🧾|📖|📜)/u.test(line) && !weatherMarker.test(line)
  ).map(clean).join('\n')
  const photography = lines.filter(line => photographyMarker.test(line) || photoCountLine(line))
  const weather = lines.filter(line => weatherMarker.test(line)).join('\n')
  const id = /^x+$/i.test(shortcode) ? `${filenameSpecies}-${date}` : shortcode
  return {
    id, shortcode: /^x+$/i.test(shortcode) ? null : shortcode,
    speciesId: speciesId(latinName), latinName, identification, genus: latinName.split(' ')[0],
    commonName: commonNames.find(name => name.language === 'English')?.name || '',
    commonNames, family: taxonomy[0] || '', taxonomy,
    date: date || (timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 10) : ''),
    observedAt: get('🗓'), location: get('🌎') || get('🌍'), coordinates: get('📌'),
    habitat, weather, photography, camera: get('📷'), lens: get('🔭'),
    photoCountText: lines.filter(line => photoCountLine(line)).map(clean).join(' · '),
    science: { identification, taxonomy, commonNames, traits, raw: scienceLines.join('\n'), gbifUrl, references, publication },
    description: traits.find(item => item.label === 'Overview')?.text || '',
    hashtags, caption, photos, sourceFile, source,
    instagramUrl: /^x+$/i.test(shortcode) ? null : `https://www.instagram.com/p/${shortcode}/`,
  }
}

export function groupSpecies(posts) {
  const grouped = new Map()
  for (const post of posts) {
    if (!grouped.has(post.speciesId)) grouped.set(post.speciesId, [])
    grouped.get(post.speciesId).push(post)
  }
  return [...grouped.entries()].map(([id, observations]) => {
    observations.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    const newest = observations[0]
    return {
      id, latinName: newest.latinName, identification: newest.identification,
      genus: newest.genus, family: newest.family, commonName: newest.commonName,
      science: newest.science, scienceYear: newest.date.slice(0, 4),
      scienceSource: { id: newest.id, date: newest.date, file: newest.sourceFile },
      description: newest.description,
      latestDate: newest.date, firstDate: observations.at(-1).date,
      hashtags: uniqueHashtags(observations.flatMap(post => post.hashtags)),
      observations,
    }
  }).sort((a, b) => a.latinName.localeCompare(b.latinName))
}

export function validateExport(data) {
  if (data?.format !== 'fungarium-instagram-v1' || data.username !== 'fungarium.info' || !Array.isArray(data.posts)) throw new Error('Choose the fungarium.info JSON file created by the browser export script.')
  if (!data.posts.length) throw new Error('The export contains no posts.')
  const seen = new Set()
  for (const post of data.posts) {
    if (!/^[A-Za-z0-9_-]{5,30}$/.test(post.shortcode || '') || typeof post.caption !== 'string' || !Array.isArray(post.photos)) throw new Error('Invalid captions, media, or post ID in export.')
    if (seen.has(post.shortcode)) throw new Error(`Duplicate Instagram post: ${post.shortcode}`)
    seen.add(post.shortcode)
    for (const photo of post.photos) {
      let url
      try { url = new URL(photo.url) } catch { throw new Error('Invalid photo URL in export.') }
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !/(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(url.hostname)) throw new Error('Photo URLs must point to Instagram’s HTTPS media servers.')
    }
  }
  return data
}
