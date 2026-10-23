import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assetUrl } from '../src/lib/asset-urls.mjs'

test('generated image paths resolve under the configured deployment base', () => {
  assert.equal(assetUrl('/images/posts/post123/01.jpg', '/encyclopedia/'), '/encyclopedia/images/posts/post123/01.jpg')
  assert.equal(assetUrl('/thumbs/posts/post123/01.webp', '/encyclopedia/'), '/encyclopedia/thumbs/posts/post123/01.webp')
  assert.equal(assetUrl('/branding/fungarium-mark.png', '/encyclopedia/'), '/encyclopedia/branding/fungarium-mark.png')
  assert.equal(assetUrl('images/example.jpg', '/other/folder/'), '/other/folder/images/example.jpg')
  assert.equal(assetUrl('./images/example.jpg', '/encyclopedia/'), '/encyclopedia/images/example.jpg')
})

test('root deployments, external images and absent images retain their behavior', () => {
  assert.equal(assetUrl('/images/example.jpg', '/'), '/images/example.jpg')
  assert.equal(assetUrl(undefined, '/encyclopedia/'), '')
  assert.equal(assetUrl(null, '/encyclopedia/'), '')
  for (const url of ['https://example.org/photo.jpg', '//example.org/photo.jpg', 'data:image/png;base64,AAAA', 'blob:https://example.org/image']) {
    assert.equal(assetUrl(url, '/encyclopedia/'), url)
  }
})
