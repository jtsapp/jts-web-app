// Разрезает standalone «ситуаций.html» (оболочка с 5 вложенными уровневыми
// страницами A1–C1, ~62 МБ из-за base64-видео) на лёгкие уровневые страницы:
//   public/practice/situations/<level>.html  — движок уровня без base64
//   public/practice/situations/media/*       — видео (mp4) и постеры (jpg)
//   src/practice/situations/levels.js        — мета уровней для карточек Практики
//
// Запуск: node scripts/extract-situations.js [путь к ситуаций.html]
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = process.argv[2] || '/Users/mirasnurlanov/Desktop/ситуаций.html'
const OUT_HTML = path.join(ROOT, 'public/practice/situations')
const OUT_MEDIA = path.join(OUT_HTML, 'media')
const OUT_META = path.join(ROOT, 'src/practice/situations/levels.js')

const SENTINEL = '%%JTS_END_SCRIPT_7Q2X%%'
// мета уровней — как в оболочке ситуаций.html (levelbar)
const LEVELS = [
  { code: 'a1', label: 'A1', desc: 'Beginner' },
  { code: 'a2', label: 'A2', desc: 'Elementary' },
  { code: 'b1', label: 'B1', desc: 'Intermediate' },
  { code: 'b2', label: 'B2', desc: 'Upper-Intermediate' },
  { code: 'c1', label: 'C1', desc: 'Advanced' },
]

const html = fs.readFileSync(SRC, 'utf8')
fs.mkdirSync(OUT_MEDIA, { recursive: true })

const EXT = { 'video/mp4': 'mp4', 'image/jpeg': 'jpg', 'image/png': 'png', 'audio/mpeg': 'mp3' }
const meta = []

for (const { code, desc } of LEVELS) {
  const open = `<script type="text/plain" class="level-src" data-level="${code}">`
  const at = html.indexOf(open)
  if (at < 0) throw new Error('level block not found: ' + code)
  const end = html.indexOf('</' + 'script>', at)
  let doc = html.slice(at + open.length, end).split(SENTINEL).join('</' + 'script>')

  // все data-URI (в JS-данных SITUATIONS и, у C1, прямо в HTML-атрибутах) → файлы
  const counters = {}
  let items = 0
  doc = doc.replace(
    /data:(video\/mp4|image\/jpeg|image\/png|audio\/mpeg);base64,([A-Za-z0-9+/=]+)/g,
    (_, mime, b64) => {
      const ext = EXT[mime]
      counters[ext] = (counters[ext] || 0) + 1
      const name = `${code}-${ext === 'mp4' ? 'v' : ext === 'mp3' ? 'a' : 'p'}${String(counters[ext]).padStart(2, '0')}.${ext}`
      fs.writeFileSync(path.join(OUT_MEDIA, name), Buffer.from(b64, 'base64'))
      return `/practice/situations/media/${name}`
    }
  )
  const m = doc.match(/const SITUATIONS = \[/)
  if (!m) throw new Error('SITUATIONS not found: ' + code)
  const sm = doc.match(/const SITUATIONS = (\[.*?\]);?\n/)
  if (sm) items = JSON.parse(sm[1]).length

  fs.writeFileSync(path.join(OUT_HTML, `${code}.html`), doc)
  meta.push({ code, label: code.toUpperCase(), desc, items, poster: `/practice/situations/media/${code}-p01.jpg` })
  console.log(code, 'videos:', counters.mp4 || 0, 'posters:', counters.jpg || 0, 'items:', items, 'html KB:', Math.round(doc.length / 1024))
}

fs.mkdirSync(path.dirname(OUT_META), { recursive: true })
fs.writeFileSync(
  OUT_META,
  `// АВТО-СГЕНЕРИРОВАНО scripts/extract-situations.js — не редактировать вручную.
// Мета уровней разговорной практики (standalone-страницы в public/practice/situations/).
export const SITUATION_LEVELS = ${JSON.stringify(meta, null, 2)}
`
)
console.log('OK, media total MB:', (fs.readdirSync(OUT_MEDIA).reduce((s, f) => s + fs.statSync(path.join(OUT_MEDIA, f)).size, 0) / 1048576).toFixed(1))
