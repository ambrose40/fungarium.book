// Derivatives are generated for the same first available cover selected by the gallery.
// Original image URLs remain the source for the full-image viewer.
export function coverPreviewPath(photo) {
  const src = photo?.src || ''
  if (!/^\/images\/posts\/[\w-]+\/[^/]+\.(?:jpe?g|png|webp|avif)$/iu.test(src)) return src
  return src.replace('/images/posts/', '/thumbs/posts/').replace(/\.[^.]+$/u, '.cover-v1.webp')
}

export function topNineWebpPath(src) { return src.replace(/\.jpe?g$/iu, '.webp') }
