import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseCoordinates, googleMapsUrl } from '../src/lib/coordinates.mjs'

test('standard DMS and curly quotes produce the same pinned coordinates', () => {
  const standard = parseCoordinates('59°23\'08.7"N 25°23\'46.6"E')
  const curly = parseCoordinates('59°23’08.7”N 25°23’46.6”E')
  assert.deepEqual(curly, standard)
  assert.ok(Math.abs(standard.latitude - 59.38575) < 0.0000001)
  assert.ok(Math.abs(standard.longitude - 25.3962777778) < 0.0000001)
  const url = new URL(googleMapsUrl('59°23\'08.7"N 25°23\'46.6"E'))
  assert.equal(url.origin, 'https://www.google.com')
  assert.equal(url.pathname, '/maps/search/')
  assert.equal(url.searchParams.get('api'), '1')
  assert.equal(url.searchParams.get('query'), '59.3857500,25.3962778')
})

test('older prefixed hemispheres use supplied decimal annotations when available', () => {
  assert.deepEqual(parseCoordinates('N 48° 11\' 32.8" (48.1924316), E 16° 28\' 15.7" (16.4710233)'), {
    latitude: 48.1924316, longitude: 16.4710233,
  })
  assert.deepEqual(parseCoordinates('59°27\'16.7"N 24°21\'37.0"E (59.454624, 24.360286)'), {
    latitude: 59.454624, longitude: 24.360286,
  })
})

test('southern/western hemispheres and simple decimal pairs preserve signs', () => {
  assert.deepEqual(parseCoordinates('S 33° 30\' 00" W 70° 40\' 00"'), { latitude: -33.5, longitude: -(70 + 40 / 60) })
  assert.deepEqual(parseCoordinates('-33.5, -70.6'), { latitude: -33.5, longitude: -70.6 })
  assert.deepEqual(parseCoordinates('0,0'), { latitude: 0, longitude: 0 })
  const rounded = parseCoordinates('59°26\'30.7"N 24°46\'60.0"E')
  assert.ok(Math.abs(rounded.longitude - (24 + 47 / 60)) < 0.000000001)
})

test('invalid or ambiguous coordinates do not generate misleading map pins', () => {
  for (const text of ['', null, 'Tallinn', '91, 24', '59,181', '59°70\'00"N 24°00\'00"E', '59°00\'80"N 24°00\'00"E', '59°00\'00"N', '59°00\'00"N 24°00\'00"N']) {
    assert.equal(googleMapsUrl(text), null, String(text))
  }
})

test('every recorded encounter coordinate in the current corpus can produce a Google Maps pin', async () => {
  const data = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'))
  let count = 0
  const unparsed = []
  for (const item of data.species) for (const post of item.observations) {
    if (!post.coordinates) continue
    if (!/\d/u.test(post.coordinates)) {
      assert.equal(googleMapsUrl(post.coordinates), null)
      continue
    }
    count++
    if (!parseCoordinates(post.coordinates)) unparsed.push(`${post.sourceFile}: ${post.coordinates}`)
  }
  assert.ok(count > 300)
  assert.deepEqual(unparsed, [])
})
