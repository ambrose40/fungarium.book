import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
export async function prepareFonts(root) {
  const directory = path.join(root, 'public/fonts')
  await mkdir(directory, { recursive: true })
  const sans = path.dirname(require.resolve('@fontsource-variable/dm-sans/package.json'))
  const serif = path.dirname(require.resolve('@fontsource/libre-caslon-display/package.json'))
  await Promise.all([
    copyFile(path.join(sans, 'files/dm-sans-latin-wght-normal.woff2'), path.join(directory, 'dm-sans-latin-variable.woff2')),
    copyFile(path.join(sans, 'files/dm-sans-latin-ext-wght-normal.woff2'), path.join(directory, 'dm-sans-latin-ext-variable.woff2')),
    copyFile(path.join(serif, 'files/libre-caslon-display-latin-400-normal.woff2'), path.join(directory, 'libre-caslon-display-latin.woff2')),
    copyFile(path.join(sans, 'LICENSE'), path.join(directory, 'DM-Sans-OFL.txt')),
    copyFile(path.join(serif, 'LICENSE'), path.join(directory, 'Libre-Caslon-Display-OFL.txt')),
  ])
}
