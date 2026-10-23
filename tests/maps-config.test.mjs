import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { googleMapsApiKey } from '../scripts/maps-config.mjs'

test('maps configuration reads a trimmed local key without needing an environment value', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'fungarium-maps-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const keyFile = join(directory, 'maps-api.key')
  await writeFile(keyFile, '\uFEFF local-test-key \r\n')
  assert.equal(googleMapsApiKey({ keyFile }), 'local-test-key')
  assert.equal(googleMapsApiKey({ keyFile, environment: { GOOGLE_MAPS_API_KEY: ' environment-test-key ' } }), 'environment-test-key')
  assert.equal(googleMapsApiKey({ keyFile, environment: { GOOGLE_MAPS_API_KEY: '' } }), '')
})

test('a missing Maps key disables maps and environment configuration needs no local file', () => {
  const keyFile = new URL('../secrets/nonexistent-test-key.key', import.meta.url)
  assert.equal(googleMapsApiKey({ keyFile }), '')
  assert.equal(googleMapsApiKey({ keyFile, environment: { GOOGLE_MAPS_API_KEY: 'environment-test-key' } }), 'environment-test-key')
})
