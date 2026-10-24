import { mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export async function prepareBranding(root) {
  const source = path.join(root, 'fungi-support/favicon_package_v0.16')
  const icons = path.join(root, 'public/icons')
  const branding = path.join(root, 'public/branding')
  await mkdir(icons, { recursive: true })
  await mkdir(branding, { recursive: true })
  await Promise.all([
    ...['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png',
      'android-chrome-192x192.png', 'android-chrome-512x512.png', 'safari-pinned-tab.svg']
      .map(file => copyFile(path.join(source, file), path.join(icons, file))),
    copyFile(path.join(source, 'android-chrome-192x192.png'), path.join(branding, 'fungarium-mark.png')),
  ])
  await sharp(path.join(branding, 'fungarium-mark.png')).webp({ lossless: true }).toFile(path.join(branding, 'fungarium-mark.webp'))
}
