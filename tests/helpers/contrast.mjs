export function parseColor(value) {
  if (value.startsWith('#')) {
    const hex = value.slice(1)
    const expanded = hex.length === 3 ? [...hex].map(character => character.repeat(2)).join('') : hex
    return [0, 2, 4].map(offset => parseInt(expanded.slice(offset, offset + 2), 16)).concat(expanded.length === 8 ? parseInt(expanded.slice(6), 16) / 255 : 1)
  }
  const values = value.match(/[\d.]+/gu)?.map(Number)
  if (!values || values.length < 3) throw new Error(`Unsupported audit colour: ${value}`)
  return [values[0], values[1], values[2], values[3] ?? 1]
}

export function composite(foreground, background) {
  const alpha = foreground[3] ?? 1
  return foreground.slice(0, 3).map((channel, index) => channel * alpha + background[index] * (1 - alpha)).concat(1)
}

function luminance(color) {
  const values = color.slice(0, 3).map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}

export function contrastRatio(a, b) {
  const values = [luminance(a), luminance(b)].sort((left, right) => right - left)
  return (values[0] + 0.05) / (values[1] + 0.05)
}
