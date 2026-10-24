import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { root } from '../project-paths.mjs'

export const coverageRoot = path.join(root, 'coverage')
export const browserBuild = path.join(coverageRoot, 'browser-build')
export const metrics = ['lines', 'statements', 'functions', 'branches']

export function sourcePath(value) {
  let normalized = value.replaceAll('\\', '/').split('?')[0]
  if (normalized.startsWith('file:')) normalized = fileURLToPath(normalized).replaceAll('\\', '/')
  if (normalized.includes('/node_modules/') || normalized.startsWith('node_modules/')) return normalized
  for (const folder of ['src', 'scripts']) {
    const position = normalized.indexOf(`/${folder}/`)
    if (position >= 0) return normalized.slice(position + 1)
  }
  return normalized
}

export function inScope(value, kind) {
  const file = sourcePath(value)
  if (kind === 'node') return /^(?:src\/lib\/|scripts\/).*\.mjs$/u.test(file) && !file.startsWith('scripts/coverage/')
  return /^src\/.*\.(?:js|mjs|vue)$/u.test(file) && !file.startsWith('src/data/')
}

export async function transformUntestedVue(entry) {
  if (!entry.sourcePath.endsWith('.vue')) return
  const filename = fileURLToPath(entry.url)
  const { descriptor, errors } = parse(entry.source, { filename })
  if (errors.length) throw new Error(`Cannot parse untested Vue source: ${filename}`)
  if (!descriptor.script && !descriptor.scriptSetup) {
    const compiled = compileTemplate({ source: descriptor.template?.content || '', filename, id: 'coverage-empty', sourceMap: true })
    if (compiled.errors.length) throw new Error(`Cannot compile untested Vue template: ${filename}`)
    entry.source = compiled.code
    entry.sourceMap = compiled.map
    return
  }
  const compiled = compileScript(descriptor, { id: 'coverage-empty', inlineTemplate: true, sourceMap: true })
  entry.source = compiled.content
  entry.sourceMap = compiled.map
}

export function coverageOptions(kind) {
  return {
    name: `Fungarium ${kind === 'node' ? 'Node utilities and scripts' : 'browser application'} coverage`,
    baseDir: root,
    outputDir: path.join(coverageRoot, kind),
    clean: false,
    cleanCache: false,
    logging: 'error',
    v8Ignore: false,
    entryFilter: entry => {
      if (kind === 'browser') return /\/assets\/[^/]+\.js$/u.test(new URL(entry.url).pathname)
      if (!entry.url.startsWith('file:')) return false
      const relative = path.relative(root, fileURLToPath(entry.url))
      return !relative.startsWith('..') && inScope(relative, kind)
    },
    sourceFilter: file => inScope(file, kind),
    sourcePath,
    all: {
      dir: kind === 'node' ? [path.join(root, 'src/lib'), path.join(root, 'scripts')] : path.join(root, 'src'),
      filter: file => inScope(file, kind),
      ...(kind === 'browser' ? { transformer: transformUntestedVue } : {}),
    },
    reports: ['html', 'json', 'json-summary', 'lcovonly', ['cobertura', { projectRoot: '.' }]],
  }
}
