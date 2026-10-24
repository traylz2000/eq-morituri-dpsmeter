/**
 * Renders the app icon from the same SVG the UI draws, using Electron itself.
 *
 * No image toolchain, no design asset to keep in sync: the icon IS the emblem,
 * rendered offscreen at 1024px and written to build/icon.png.
 *
 * It also writes build/icon.ico, and that one is not a convenience. Embedding
 * an icon into the executable needs an .ico, and the electron-builder step
 * that would produce one first extracts a cache archive full of macOS
 * symlinks - which needs a Windows privilege a normal account does not have,
 * so it fails and the exe ships with Electron's generic atom. Writing the .ico
 * here sidesteps that entirely: the format is a header, a table and a run of
 * PNGs, and Windows has read PNG-in-ICO since Vista.
 *
 *   node scripts/make-icon.mjs [--ozone-platform=headless]
 */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'build', 'icon.png')
mkdirSync(dirname(out), { recursive: true })

/**
 * The emblem, with a dark rounded plate behind it. A transparent icon
 * disappears on a dark taskbar, and the mark's own halo is too faint to carry
 * it at 16px.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="1024" height="1024">
  <defs>
    <radialGradient id="plate" cx="50%" cy="38%" r="72%">
      <stop offset="0" stop-color="#231d14"/><stop offset="1" stop-color="#0a0806"/>
    </radialGradient>
    <radialGradient id="halo"><stop offset=".52" stop-color="#8a6a2a" stop-opacity="0"/>
      <stop offset=".72" stop-color="#d8b45a" stop-opacity=".28"/>
      <stop offset="1" stop-color="#d8b45a" stop-opacity="0"/></radialGradient>
  </defs>

  <rect x="4" y="4" width="192" height="192" rx="42" fill="url(#plate)"/>
  <circle cx="100" cy="100" r="92" fill="url(#halo)"/>
  <circle cx="100" cy="100" r="61.4" fill="#0d0b08" fill-opacity=".9"/>

  <g stroke="#d8b45a" stroke-linecap="round">
    ${[
      [149.6, 100.0, 161.4, 100.0, 1],
      [147.3, 127.3, 153.2, 130.7, 0],
      [127.3, 147.3, 130.7, 153.2, 0],
      [100.0, 149.6, 100.0, 161.4, 1],
      [72.7, 147.3, 69.3, 153.2, 0],
      [52.7, 127.3, 46.8, 130.7, 0],
      [50.4, 100.0, 38.6, 100.0, 1],
      [52.7, 72.7, 46.8, 69.3, 0],
      [72.7, 52.7, 69.3, 46.8, 0],
      [100.0, 50.4, 100.0, 38.6, 1],
      [127.3, 52.7, 130.7, 46.8, 0],
      [147.3, 72.7, 153.2, 69.3, 0]
    ]
      .map(
        ([x1, y1, x2, y2, major]) =>
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-opacity="${major ? 0.9 : 0.5}" stroke-width="${major ? 2.6 : 1.7}"/>`
      )
      .join('\n    ')}
  </g>

  <circle cx="100" cy="100" r="61.4" fill="none" stroke="#d8b45a" stroke-opacity=".9" stroke-width="2.2"/>

  <path d="M73.13 126.87 A38 38 0 1 1 126.87 126.87" fill="none" stroke="#d8b45a" stroke-opacity=".55"
        stroke-width="6" stroke-linecap="round"/>
  <path d="M126.87 73.13 A38 38 0 0 1 126.87 126.87" fill="none" stroke="#f0621f" stroke-width="6"
        stroke-linecap="round"/>

  <line x1="96" y1="106.93" x2="117" y2="70.56" stroke="#f0621f" stroke-width="4.2" stroke-linecap="round"/>
  <circle cx="100" cy="100" r="7.5" fill="#d8b45a"/>
  <circle cx="98" cy="98" r="2.6" fill="#fff" fill-opacity=".8"/>
</svg>`

// overflow:hidden matters: without it the transparent window renders its
// scrollbars and they end up baked into the corner of the icon.
const HTML = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}
svg{display:block}</style>${SVG}`

/**
 * Sizes baked into the .ico.
 *
 * Windows picks per context - 16 in the title bar and Explorer's detail view,
 * 32 on the desktop, 48 in the taskbar's jump list, 256 in the large-icon
 * view. Shipping only the big one leaves Windows to downscale, and a
 * hairline-heavy mark like this one turns to mush when it does.
 */
const SIZES = [16, 24, 32, 48, 64, 128, 256]

// A tiny Electron main script: load the markup, capture it, print base64 -
// once at full size, then resized for every entry the .ico needs.
const MAIN = `
const { app, BrowserWindow } = require('electron')
app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024, height: 1024, show: false, frame: false, transparent: true,
    webPreferences: { offscreen: false }
  })
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(${JSON.stringify(HTML)}))
  // One frame is not always enough for gradients to be composited.
  await new Promise((r) => setTimeout(r, 600))
  const img = await win.webContents.capturePage()
  process.stdout.write('ICON:' + img.toPNG().toString('base64') + '\\n')
  for (const size of ${JSON.stringify(SIZES)}) {
    const small = img.resize({ width: size, height: size, quality: 'best' })
    process.stdout.write('SIZE:' + size + ':' + small.toPNG().toString('base64') + '\\n')
  }
  app.quit()
})
`

/**
 * Pack PNGs into an .ico.
 *
 * A six-byte header, then one sixteen-byte entry per image, then the images.
 * Width and height are single bytes, so 256 is written as 0 - the one piece of
 * the format that surprises people.
 */
function buildIco(images) {
  const HEADER = 6
  const ENTRY = 16
  const header = Buffer.alloc(HEADER)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = icon
  header.writeUInt16LE(images.length, 4)

  const entries = Buffer.alloc(ENTRY * images.length)
  let offset = HEADER + ENTRY * images.length

  images.forEach((img, i) => {
    const at = i * ENTRY
    entries.writeUInt8(img.size >= 256 ? 0 : img.size, at)
    entries.writeUInt8(img.size >= 256 ? 0 : img.size, at + 1)
    entries.writeUInt8(0, at + 2) // palette size, 0 for truecolour
    entries.writeUInt8(0, at + 3) // reserved
    entries.writeUInt16LE(1, at + 4) // colour planes
    entries.writeUInt16LE(32, at + 6) // bits per pixel
    entries.writeUInt32LE(img.data.length, at + 8)
    entries.writeUInt32LE(offset, at + 12)
    offset += img.data.length
  })

  return Buffer.concat([header, entries, ...images.map((i) => i.data)])
}

const tmp = join(root, 'build', '_icon-main.cjs')
writeFileSync(tmp, MAIN)

// Strip ELECTRON_RUN_AS_NODE for the same reason scripts/dev.mjs does.
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

// The electron package's main export is the path to its binary, on any OS.
// Extra arguments pass through - on a machine with no display, add
// --ozone-platform=headless.
const electron = createRequire(import.meta.url)('electron')
const child = spawn(electron, [tmp, ...process.argv.slice(2)], { env })

let buffer = ''
child.stdout.on('data', (d) => {
  buffer += d.toString()
})
child.stderr.on('data', (d) => process.stderr.write(d))

child.on('exit', () => {
  const match = /ICON:([A-Za-z0-9+/=]+)/.exec(buffer)
  if (!match) {
    console.error('icon render produced no image')
    process.exit(1)
  }
  writeFileSync(out, Buffer.from(match[1], 'base64'))
  console.log(`wrote ${out}`)

  const images = []
  for (const line of buffer.split('\n')) {
    const m = /^SIZE:(\d+):([A-Za-z0-9+/=]+)$/.exec(line.trim())
    if (m) images.push({ size: Number(m[1]), data: Buffer.from(m[2], 'base64') })
  }

  if (images.length === 0) {
    console.error('no resized images came back; .ico not written')
    process.exit(1)
  }

  // Largest first is what most tools expect to find at the top of the table.
  images.sort((a, b) => b.size - a.size)
  const ico = join(root, 'build', 'icon.ico')
  writeFileSync(ico, buildIco(images))
  console.log(`wrote ${ico} (${images.map((i) => i.size).join(', ')})`)
})
