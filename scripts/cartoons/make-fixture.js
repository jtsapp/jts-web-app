// Урезанная копия прототипа «Cartoon World» для тестов: вход оракула
// (scripts/cartoons/extract-oracle.js), каталог и миссии в форме бэкенда для
// vitest и e2e, файл для ручной проверки заливки в админке.
//
// Сам прототип (13 МБ: 6.3 МБ текста миссий и 6.4 МБ фонов) в git не кладём.
// Копия: все видео LIBRARY и DATA, первые строки CATALOG и EXTRA (среди них —
// «взрослое» с предупреждением), миссии только к ним, все десять фонов — JPEG 8×8.
// Скрипт движка и разметка — байт в байт: оракул гоняет именно их.
//
// Запуск: node scripts/cartoons/make-fixture.js --html "<путь к прототипу>"

const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'cartoons', '__fixtures__')
const KEEP_CATALOG = 8
const KEEP_EXTRA = 8

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

// window.NAME = {...}; — литерал вырезается счётом скобок с учётом строк
function literal(html, name) {
  const at = html.indexOf(`window.${name} = `)
  if (at < 0) throw new Error(`нет window.${name}`)
  const s = html.indexOf('{', at)
  let d = 0
  let q = null
  for (let j = s; j < html.length; j++) {
    const c = html[j]
    if (q) {
      if (c === '\\') j++
      else if (c === q) q = null
      continue
    }
    if (c === '"' || c === "'") q = c
    else if (c === '{') d++
    else if (c === '}' && --d === 0) return JSON.parse(html.slice(s, j + 1))
  }
  throw new Error(`незакрытый литерал ${name}`)
}

function between(html, open, close, from = 0) {
  const a = html.indexOf(open, from)
  const b = html.indexOf(close, a + open.length)
  if (a < 0 || b < 0) throw new Error(`нет ${open}…${close}`)
  return html.slice(a + open.length, b)
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу Cartoon World>')
  const html = fs.readFileSync(src, 'utf8')

  const library = literal(html, 'CARTOON_LIBRARY')
  const data = literal(html, 'CARTOON_DATA')
  const catalog = literal(html, 'CARTOON_CATALOG')
  const extra = literal(html, 'CARTOON_EXTRA')
  const missions = literal(html, 'CARTOON_MISSIONS')
  const bg = literal(html, 'MISSION_BG')

  catalog.rows = catalog.rows.slice(0, KEEP_CATALOG)
  const adult = extra.rows.find((r) => r.audience === 'adults' && r.warning_ru)
  extra.rows = extra.rows.slice(0, KEEP_EXTRA)
  if (adult && !extra.rows.includes(adult)) extra.rows.push(adult)

  const ids = [
    ...library.entries.map((e) => e.id),
    ...data.episodes.map((e) => e.id),
    ...catalog.rows.map((r) => 'cat-' + r[1]),
    ...extra.rows.map((r) => 'ext-' + r.yt),
  ]
  const miniMissions = Object.fromEntries(ids.filter((id) => missions[id]).map((id) => [id, missions[id]]))

  const tiny = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 99, g: 50, b: 255 } } })
    .jpeg({ quality: 40 })
    .toBuffer()
  const tinyUri = 'data:image/jpeg;base64,' + tiny.toString('base64')
  const miniBg = Object.fromEntries(Object.keys(bg).map((k) => [k, tinyUri]))

  const head = html.slice(0, html.indexOf('<style>'))
  const css = between(html, '<style>', '</style>')
    .split('\n')
    .filter((l) => !l.startsWith('@font-face'))
    .join('\n')
  const bodyStart = html.indexOf('<body>') + '<body>'.length
  const markup = html.slice(bodyStart, html.indexOf('<script>', bodyStart))
  const engineOpen = html.lastIndexOf('<script>')
  const engine = html.slice(engineOpen + '<script>'.length, html.indexOf('</script>', engineOpen))

  const lit = (name, value) => `window.${name} = ${JSON.stringify(value)};`
  const out = [
    head + `<style>${css}</style>\n</head>\n<body>${markup}<script>`,
    lit('CARTOON_LIBRARY', library),
    lit('CARTOON_DATA', data),
    lit('CARTOON_EXTRA', extra),
    lit('CARTOON_CATALOG', catalog),
    '</script>\n<script>',
    lit('CARTOON_MISSIONS', miniMissions),
    lit('MISSION_BG', miniBg),
    `</script>\n  <script>${engine}</script>\n</body>\n</html>\n`,
  ].join('\n')
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), out)

  // Форма ответа бэкенда (/mobile/cartoons и /mobile/cartoons/missions/{id}):
  // источники как есть, фоны — ссылками, одно видео — «нерабочее».
  const dead = { id: 'cat-' + catalog.rows[catalog.rows.length - 1][1], yt: catalog.rows[catalog.rows.length - 1][1], level: catalog.rows[catalog.rows.length - 1][0], title: 'dead' }
  const index = {
    release: 1,
    uploadedAt: '2026-10-22T00:00:00Z',
    checkedAt: '2026-10-22T00:00:00Z',
    library,
    data,
    catalog,
    extra,
    bg: Object.fromEntries(Object.keys(bg).map((k) => [k, `/__cw-media/${k}.jpg`])),
    unavailable: [dead],
    unchecked: 0,
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index))
  fs.writeFileSync(path.join(OUT, 'missions.json'), JSON.stringify(miniMissions))
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
  console.log(`prototype-mini.html ${kb('prototype-mini.html')} КБ, index.json ${kb('index.json')} КБ, missions.json ${kb('missions.json')} КБ; видео ${ids.length}, миссий ${Object.keys(miniMissions).length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
