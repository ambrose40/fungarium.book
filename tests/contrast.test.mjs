import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composite, contrastRatio, parseColor } from './helpers/contrast.mjs'

test('contrast audit calculations use WCAG relative luminance and alpha compositing', () => {
  assert.equal(contrastRatio(parseColor('#fff'), parseColor('#000')), 21)
  assert.equal(contrastRatio(parseColor('#121212'), parseColor('#121212')), 1)
  assert.ok(contrastRatio(parseColor('#767676'), parseColor('#fff')) >= 4.5)
  assert.ok(contrastRatio(parseColor('#777777'), parseColor('#fff')) < 4.5)
  assert.deepEqual(composite(parseColor('rgba(0, 0, 0, 0.5)'), parseColor('#fff')), [127.5, 127.5, 127.5, 1])
})
