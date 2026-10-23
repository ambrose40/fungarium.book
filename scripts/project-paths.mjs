import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../', import.meta.url))

export function instagramMetaDirectory(projectRoot = root) {
  return path.join(projectRoot, 'instagram-meta')
}
