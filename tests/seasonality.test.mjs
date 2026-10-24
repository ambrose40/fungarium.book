import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recordedSeasonality } from '../src/lib/seasonality.mjs'

const profile = (text, label = 'Ecology') => ({ traits: [{ label, text }] })
const active = period => period?.segments.filter(item => item.active).map(item => item.id)

test('season ranges preserve seasonal precision, winter wrap, and disjoint records', () => {
  const range = recordedSeasonality(profile('Saprobic on wood; late spring to early autumn'))
  assert.equal(range.kind, 'seasons')
  assert.deepEqual(active(range), ['spring', 'summer', 'autumn'])
  assert.deepEqual(active(recordedSeasonality(profile('Autumn to early spring', 'Fruiting period'))), ['spring', 'autumn', 'winter'])
  assert.deepEqual(active(recordedSeasonality(profile('Saprobic, summer and autumn'))), ['summer', 'autumn'])
  assert.deepEqual(active(recordedSeasonality(profile('Saprobic; autumn, also in spring'))), ['spring', 'autumn'])
})

test('month ranges remain month ranges without guessing hemisphere or converting seasons', () => {
  assert.deepEqual(active(recordedSeasonality(profile('Saprobic, July to November', 'Description'))), ['july', 'august', 'september', 'october', 'november'])
  assert.deepEqual(active(recordedSeasonality(profile('Fruits from July to November'))), ['july', 'august', 'september', 'october', 'november'])
  assert.deepEqual(active(recordedSeasonality(profile('November–March', 'Phenology'))), ['january', 'february', 'march', 'november', 'december'])
  assert.deepEqual(active(recordedSeasonality(profile('May to September', 'Fruiting period'))), ['may', 'june', 'july', 'august', 'september'])
  assert.deepEqual(active(recordedSeasonality(profile('May be found in autumn'))), ['autumn'])
})

test('seasonality excludes incidental winter habitat, life-cycle claims, typos, and encounter dates', () => {
  const text = 'Saprobic near roads where winter salt accumulates; summer to late autumn'
  assert.deepEqual(active(recordedSeasonality(profile(text))), ['summer', 'autumn'])
  assert.deepEqual(recordedSeasonality(profile(text)).evidence, [{ label: 'Ecology', text }])
  assert.equal(recordedSeasonality(profile('Ascospores are released in spring; conidia spread in summer')), null)
  assert.equal(recordedSeasonality(profile('Saprobic, novemeber - december')), null)
  assert.equal(recordedSeasonality({ traits: [{ label: 'Cap', text: 'Summer-coloured brown cap.' }], observations: [{ date: '2026-08-01' }] }), null)
  const perennial = recordedSeasonality(profile('Found on dead wood, visible year-round, prominent in late autumn'))
  assert.match(perennial.scope, /presence/)
  assert.deepEqual(active(perennial), ['spring', 'summer', 'autumn', 'winter'])
})
