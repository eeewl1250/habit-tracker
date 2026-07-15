import { existsSync, mkdirSync, cpSync, rmSync, readdirSync } from 'fs'
import { join, resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const appsDir = join(root, 'apps')
const publicDir = join(root, 'public')

if (existsSync(dist)) rmSync(dist, { recursive: true })

const appDirs = readdirSync(appsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())

for (const app of appDirs) {
  const appDist = join(appsDir, app.name, 'dist')
  if (!existsSync(appDist)) continue

  if (app.name === 'portal') {
    cpSync(appDist, dist, { recursive: true })
  } else {
    cpSync(appDist, join(dist, 'apps', app.name), { recursive: true })
  }
}

if (existsSync(publicDir)) {
  cpSync(publicDir, dist, { recursive: true })
}

console.log(`✓ Collected dist from ${appDirs.length} apps into /dist`)
