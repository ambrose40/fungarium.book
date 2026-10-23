export function hashtagText(value) {
  return String(value || '').trim().replace(/^#+/u, '').normalize('NFC')
}

export function normalizeHashtag(value) { return hashtagText(value).toLowerCase() }

export function uniqueHashtags(values) {
  const tags = new Map()
  for (const value of values) {
    const text = hashtagText(value)
    const key = normalizeHashtag(text)
    if (key && !tags.has(key)) tags.set(key, text)
  }
  return [...tags.values()]
}

export function extractHashtags(caption) {
  // Include combining marks and punctuation/emoji boundaries, excluding URL fragments and word-internal hashes.
  return uniqueHashtags([...caption.matchAll(/(?<![\p{L}\p{M}\p{N}_/#?&=])#([\p{L}\p{N}_][\p{L}\p{M}\p{N}_]*)/gu)].map(match => match[1]))
}

export function hasHashtag(tags, value) {
  const key = normalizeHashtag(value)
  return Boolean(key) && tags.some(tag => normalizeHashtag(tag) === key)
}
