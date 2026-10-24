import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { root } from '../project-paths.mjs'
import { inScope } from './config.mjs'

export async function walk(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await walk(file))
    else if (entry.isFile()) result.push(file)
  }
  return result.sort()
}

export async function expectedSources(kind) {
  const files = [...await walk(path.join(root, 'src')), ...await walk(path.join(root, 'scripts'))]
  return files.filter(file => inScope(file, kind))
}

export async function inputFingerprint() {
  const files = [
    ...await walk(path.join(root, 'src')),
    ...await walk(path.join(root, 'scripts')),
    ...await walk(path.join(root, 'tests')),
    ...['package.json', 'package-lock.json', 'vite.config.js', 'playwright.config.js', 'playwright.coverage.config.js'].map(file => path.join(root, file)),
  ].filter(file => /\.(?:js|mjs|vue|json)$/u.test(file))
  const hash = createHash('sha256')
  for (const file of files.sort()) {
    hash.update(path.relative(root, file).replaceAll('\\', '/'))
    hash.update('\0')
    hash.update(await readFile(file))
    hash.update('\0')
  }
  return hash.digest('hex')
}
