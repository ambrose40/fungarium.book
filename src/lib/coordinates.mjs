function validPair(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude } : null
}

export function parseCoordinates(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const text = value.replace(/[‘’′ʹ]/gu, "'").replace(/[“”″]/gu, '"')
    .replace(/[º˚]/gu, '°').replace(/−/gu, '-').replace(/\u00a0/gu, ' ').trim()

  // Some older captions already provide a more precise decimal pair after the DMS.
  const pair = text.match(/\(\s*([+-]?\d{1,2}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)\s*\)/u)
    || text.replace(/^📌\s*/u, '').match(/^([+-]?\d{1,2}(?:\.\d+)?)\s*[,;]\s*([+-]?\d{1,3}(?:\.\d+)?)$/u)
  if (pair) return validPair(Number(pair[1]), Number(pair[2]))

  const body = '([+-]?\\d{1,3}(?:\\.\\d+)?)\\s*°\\s*(?:(\\d{1,2}(?:\\.\\d+)?)\\s*\'\\s*)?(?:(\\d{1,2}(?:\\.\\d+)?)\\s*"\\s*)?'
  const annotation = '(?:\\s*\\(\\s*([+-]?\\d{1,3}(?:\\.\\d+)?)\\s*\\))?'
  // Separate alternatives prevent the next prefix (e.g. W) becoming the previous suffix.
  const parts = [...text.matchAll(new RegExp(`(?:([NSEW])\\s*${body}${annotation}|${body}([NSEW])${annotation})`, 'giu'))]
  const result = {}
  for (const part of parts) {
    const prefix = Boolean(part[1])
    const hemisphere = (prefix ? part[1] : part[9]).toUpperCase()
    const degrees = Number(prefix ? part[2] : part[6])
    const minutes = Number((prefix ? part[3] : part[7]) || 0)
    const seconds = Number((prefix ? part[4] : part[8]) || 0)
    const suppliedDecimal = prefix ? part[5] : part[10]
    // A rounded 60.0 seconds carries into the next minute; larger values are invalid.
    if (minutes >= 60 || seconds > 60) return null
    const decimal = suppliedDecimal ? Math.abs(Number(suppliedDecimal)) : Math.abs(degrees) + minutes / 60 + seconds / 3600
    const axis = /[NS]/u.test(hemisphere) ? 'latitude' : 'longitude'
    if (result[axis] !== undefined) return null
    result[axis] = decimal * (/[SW]/u.test(hemisphere) ? -1 : 1)
  }
  return validPair(result.latitude, result.longitude)
}

export function googleMapsUrl(coordinates) {
  const parsed = parseCoordinates(coordinates)
  if (!parsed) return null
  const query = `${parsed.latitude.toFixed(7)},${parsed.longitude.toFixed(7)}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
