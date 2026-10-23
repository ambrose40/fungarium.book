import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { captionLanguageRuns, languageTag } from '../src/lib/languages.mjs'

test('language tags reflect recorded language labels or supported flag markers without guessing unknown values', () => {
  assert.equal(languageTag({ language: 'Estonian' }), 'et')
  assert.equal(languageTag({ flag: '🇷🇺' }), 'ru')
  assert.equal(languageTag({ language: 'An unsupported language', flag: '🏳️' }), undefined)
})

test('caption language annotation preserves all source text, including mixed line endings and combining characters', async () => {
  const caption = '🆔 Example fungus\r\n🇪🇪 su\u0308gis\r\n🇷🇺 Пример\n#original'
  const runs = captionLanguageRuns(caption)
  assert.equal(runs.map(run => run.text).join(''), caption)
  assert.equal(runs[1].lang, 'et')
  assert.equal(runs[2].lang, 'ru')
  assert.equal(runs[0].lang, undefined)
  const content = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'))
  for (const item of content.species) for (const post of item.observations) assert.equal(captionLanguageRuns(post.caption).map(run => run.text).join(''), post.caption, post.sourceFile)
})
