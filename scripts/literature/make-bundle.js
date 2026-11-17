// Бандл «Literature World» в форме контракта (спека
// 2026-11-17-literature-world-design.md, «Контракт: бандл»): блоки данных
// прототипа как есть, ключи — id блока без «d-»; сцены, маскоты и видео
// входа — ссылки вместо data-URI, как их отдаёт бэкенд (MinIO).
//
// По умолчанию — из копии __fixtures__/prototype-mini.html в
// __fixtures__/bundle.json (vitest и e2e; медиа — /__literature-media/<имя>.<ext>,
// e2e отдаёт их через page.route).
//
// С --html <прототип> --out <папка> — полный бандл настоящего файла для ручной
// проверки экрана без бэкенда: <папка>/bundle.json и медиа файлами рядом
// (<папка>/media/<имя>.<ext>). В git это не кладётся.
//
// Запуск: node scripts/literature/make-bundle.js
//         node scripts/literature/make-bundle.js --html "<прототип>" --out "<папка>"

const fs = require('node:fs')
const path = require('node:path')
const P = require('./proto.js')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'literature', '__fixtures__')
const MEDIA = '/__literature-media/'
const EXT = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'video/mp4': 'mp4' }

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

/** data-URI → { ext, buf }. */
function decode(uri) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.*)$/s.exec(String(uri))
  if (!m || !EXT[m[1]]) throw new Error(`не медиа: ${String(uri).slice(0, 40)}`)
  return { ext: EXT[m[1]], buf: Buffer.from(m[2], 'base64') }
}

/** Бандл из html: медиа → ссылки (prefix + имя.расширение); write(name, buf) — сохранить файл медиа. */
function bundleOf(html, { prefix = MEDIA, write = null } = {}) {
  const d = P.dataOf(html)
  const media = (group, k, uri) => {
    const { ext, buf } = decode(uri)
    const name = `${group === 'mascots' ? 'm_' : ''}${k}.${ext}`
    if (write) write(name, buf)
    return prefix + name
  }
  const mascots = Object.fromEntries(Object.entries(d.mascots).map(([k, u]) => [k, media('mascots', k, u)]))
  const scenes = Object.fromEntries(Object.entries(d.scenes).map(([k, u]) => [k, media('scenes', k, u)]))
  return { release: 1, uploadedAt: '2026-11-17T00:00:00Z', sh: d.sh, ot: d.ot, prose: d.prose, world: d.world, x: d.x, imgmeta: d.imgmeta, mascots, scenes }
}

function main() {
  const src = arg('--html')
  const out = arg('--out')
  if (src) {
    if (!out) throw new Error('--out <папка> для полного бандла')
    fs.mkdirSync(path.join(out, 'media'), { recursive: true })
    const bundle = bundleOf(P.readHtml(src), { prefix: '/__literature-media/', write: (name, buf) => fs.writeFileSync(path.join(out, 'media', name), buf) })
    fs.writeFileSync(path.join(out, 'bundle.json'), JSON.stringify(bundle))
    console.log(`${out}/bundle.json: ${Math.round(fs.statSync(path.join(out, 'bundle.json')).size / 1024)} КБ`)
    return
  }
  const bundle = bundleOf(P.readHtml(path.join(DIR, 'prototype-mini.html')))
  fs.writeFileSync(path.join(DIR, 'bundle.json'), JSON.stringify(bundle))
  console.log(`bundle.json: ${Math.round(fs.statSync(path.join(DIR, 'bundle.json')).size / 1024)} КБ`)
}

module.exports = { bundleOf, MEDIA }

if (require.main === module) main()
