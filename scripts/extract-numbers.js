// «Числа» (Dexter's Number World): данные, картинки и шрифты из прототипа
// data/jtsnumbers.html → public/practice/numbers/.
//
// Прототип — один html на 2 МБ, почти всё в нём base64: три фона миров, позы
// Декстера, остров, портал, кристалл и шрифты объяснений (Literata, Golos Text).
// В бандл приложения это не кладём: картинки и шрифты ложатся файлами и грузятся
// только при входе в раздел.
//
// Данные не режутся регулярками: раунды собираются кодом (L(...), R(...),
// X(topic, group, …) дописывает задания в группу), поэтому блок данных
// исполняется в node:vm — от начала скрипта до метки «end of game data» плюс
// уроки (SOURCES … UI). DOM этому коду не нужен.
//
// Раунды боссов и Listening Lab прототип собирает из банков тем при загрузке;
// в data.json их нет — их так же собирает src/practice/numbers/logic.js
// (withGeneratedTours), а тест сверяет его сборку с тем, что собрал прототип.
//
// Запуск: node scripts/extract-numbers.js [--out <папка>]

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'data', 'jtsnumbers.html')
const DEFAULT_OUT = path.join(ROOT, 'public', 'practice', 'numbers')

const EXT = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'font/woff2': 'woff2' }

function decode(dataUri) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUri)
  if (!m) throw new Error(`не data-uri: ${dataUri.slice(0, 40)}…`)
  return { mime: m[1], buf: Buffer.from(m[2], 'base64') }
}

/** Блок данных прототипа, исполненный в пустом контексте. */
function runData(html) {
  const s0 = html.indexOf("<script>\n'use strict';")
  const dataEnd = html.indexOf('/* end of game data */')
  const l0 = html.indexOf('const SOURCES = {')
  const l1 = html.indexOf('const UI = {')
  if (s0 < 0 || dataEnd < 0 || l0 < 0 || l1 < 0) throw new Error('метки блока данных не найдены — прототип поменял структуру')
  const code = html.slice(s0 + '<script>\n'.length, dataEnd) + '\n' + html.slice(l0, l1) +
    '\n;({ SECTIONS, TOURS, LESSONS, SOURCES, ASSET, POSE });'
  return vm.runInNewContext(code, {}, { timeout: 10000 })
}

/** Только темы: раунды боссов и Lab собирает logic.js. */
function topicTours(sections, tours) {
  const out = {}
  for (const s of sections) if (!s.boss && !s.lab) out[s.id] = tours[s.id]
  return out
}

function extract(html) {
  const game = runData(html)
  const files = {}   // относительный путь → Buffer

  // Картинки: позы и предметы — из ASSET/POSE, фоны миров — из переменных CSS.
  const images = { ...game.ASSET, ...game.POSE }
  delete images.idle   // idle — та же картинка, что dex
  for (const [name, uri] of Object.entries(images)) {
    const { mime, buf } = decode(uri)
    files[`img/${name}.${EXT[mime]}`] = buf
  }
  for (const m of html.matchAll(/--(bg\d):url\("(data:[^"]+)"\)/g)) {
    const { mime, buf } = decode(m[2])
    files[`img/${m[1]}.${EXT[mime]}`] = buf
  }

  // Шрифты объяснений. @font-face внутри Shadow DOM не применяется надёжно —
  // экран подключает fonts.css к документу, а шрифты документа внутрь видны.
  const faces = []
  const seen = {}
  for (const m of html.matchAll(/@font-face\{font-family:'([^']+)';font-style:(\w+);font-display:(\w+);font-weight:([\d ]+);src:url\((data:font\/woff2;base64,[A-Za-z0-9+/=]+)\) format\('woff2'\);unicode-range:([^}]+)\}/g)) {
    const [, family, style, display, weight, uri, range] = m
    const slug = family.toLowerCase().replace(/\s+/g, '-')
    seen[slug] = (seen[slug] || 0) + 1
    const file = `fonts/${slug}-${seen[slug]}.woff2`
    files[file] = decode(uri).buf
    faces.push(`@font-face{font-family:'${family}';font-style:${style};font-display:${display};font-weight:${weight};src:url(/practice/numbers/${file}) format('woff2');unicode-range:${range}}`)
  }
  if (faces.length !== 8) throw new Error(`ожидалось 8 начертаний шрифтов, нашлось ${faces.length}`)
  files['fonts/fonts.css'] = Buffer.from('/* Сгенерировано scripts/extract-numbers.js из data/jtsnumbers.html */\n' + faces.join('\n') + '\n')

  const data = {
    sections: game.SECTIONS,
    tours: topicTours(game.SECTIONS, game.TOURS),
    lessons: game.LESSONS,
    sources: game.SOURCES,
  }
  // JSON.parse(JSON.stringify): дыры в массивах заданий (c[8] = тема) → null, как и прочтёт экран.
  files['data.json'] = Buffer.from(JSON.stringify(data) + '\n')
  return { files, game }
}

function write(files, outDir) {
  for (const [rel, buf] of Object.entries(files)) {
    const p = path.join(outDir, rel)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, buf)
  }
}

module.exports = { extract, runData, topicTours, SRC, DEFAULT_OUT }

if (require.main === module) {
  const i = process.argv.indexOf('--out')
  const outDir = i > 0 ? path.resolve(process.argv[i + 1]) : DEFAULT_OUT
  const { files } = extract(fs.readFileSync(SRC, 'utf8'))
  write(files, outDir)
  const total = Object.values(files).reduce((n, b) => n + b.length, 0)
  console.log(`numbers: ${Object.keys(files).length} файлов, ${(total / 1048576).toFixed(2)} МБ → ${path.relative(ROOT, outDir)}`)
}
