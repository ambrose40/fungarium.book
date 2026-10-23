// Generated media paths are project-relative, regardless of the deployment folder.
export function assetUrl(value, base = import.meta.env?.BASE_URL || '/') {
  if (typeof value !== 'string' || !value) return ''
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/iu.test(value)) return value
  return `${base.replace(/\/+$/u, '')}/${value.replace(/^\/+|^\.\//u, '')}`
}
