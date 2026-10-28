// Урезанная копия прототипа «Pronunciation World» для тестов: вход оракула
// (scripts/pronunciation/extract-oracle.js), бандл для vitest и e2e, файл для
// ручной проверки заливки в админке (движок тот же байт в байт — админка
// покажет «движок совпадает»).
//
// Сам прототип (24.9 МБ, почти всё — base64 записей, картинок и шрифтов) в git
// не кладём. Копия: уровень A0 с двумя темами (A0.1 — алфавит и раунд на
// чтение, A0.3 — схемы рта, губ и звонкости), данные Sound Lab целиком; записи
// — все 1694 ключа одним 8-байтным mp3 (какой текст прозвучит, решает код
// движка, поэтому ключи нужны все; сигнатуру проверяет бэкенд, звук в тестах
// не играет); картинки — все ключи, каждая 8×8. Шрифты (@font-face) из <style>
// выброшены: сайт рисует раздел своим шрифтом, а base64 шрифтов — 320 КБ.
//
// Модули уровня урезаны до тех же двух тем, иначе бэкенд предупредил бы
// «модуль без темы». Уровень переписан JSON-ом — это тоже JS-литерал, и
// разборщик бэкенда его примет.
//
// Чанки скрипта и их порядок — как у прототипа (спека, «Прототип»): голова,
// данные, движок; движок (чанки без данных) не меняется ни на байт.
//
// Запуск: node scripts/pronunciation/make-fixture.js --html "<путь к прототипу>"

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const sharp = require('sharp')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'pronunciation', '__fixtures__')
const LEVEL = 'A0'
const KEEP = ['A0.1', 'A0.3']
const MP3 = Buffer.from([0xff, 0xfb, 0x90, 0xc0, 0, 0, 0, 0])
const SEP = '\n;\n'

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

// Чанк данных — по признакам спеки (§«Хэш движка»); остальное — движок.
const isData = (c) =>
  c.startsWith('window.PRON') ||
  c.includes('PRON.addLevel(') ||
  c.includes('PRON.addTopics(') ||
  /^PRON\.(sounds|soundLex|featureText|soundTips) =/m.test(c)

function scriptOf(html) {
  const open = html.indexOf('<script>')
  const end = html.indexOf('</script>', open)
  if (open < 0 || end < 0) throw new Error('нет inline <script>')
  return html.slice(open + '<script>'.length, end)
}

/** Исполнить чанк данных в песочнице с пустым реестром: из урезанного файла берём объект, а не текст. */
function evalLevel(chunk) {
  const levels = []
  const PRON = { addLevel: (l) => levels.push(l), addTopics: () => {} }
  vm.runInNewContext(chunk, { PRON, window: { PRON } })
  return levels
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу Pronunciation World>')
  const html = fs.readFileSync(src, 'utf8').replace(/\r\n?/g, '\n')
  const chunks = scriptOf(html).split(SEP)
  const engine = chunks.filter((c) => !isData(c))
  if (engine.length !== 5) throw new Error(`чанков движка ${engine.length}, ждали 5`)

  // Голова: реестр + записи + картинки + логотип. Медиа читаем исполнением головы.
  const head = chunks[0]
  const box = { window: {} }
  box.window.window = box.window
  vm.runInNewContext(head, box.window)
  const P = box.window.PRON
  const prefix = head.slice(0, head.indexOf('PRON.gameAudio='))
  if (!prefix.startsWith('window.PRON=')) throw new Error('голова не начинается с window.PRON=')

  const tiny = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 135, g: 75, b: 248, alpha: 1 } } })
    .webp({ quality: 50 })
    .toBuffer()
  const tinyUri = 'data:image/webp;base64,' + tiny.toString('base64')
  const mp3Uri = 'data:audio/mpeg;base64,' + MP3.toString('base64')
  const audioKeys = Object.keys(P.gameAudio)
  const assetKeys = Object.keys(P.ASSETS)
  const miniAudio = Object.fromEntries(audioKeys.map((k) => [k, mp3Uri]))
  const miniAssets = Object.fromEntries(assetKeys.map((k) => [k, tinyUri]))
  const miniHead = `${prefix}PRON.gameAudio=${JSON.stringify(miniAudio)};PRON.ASSETS=${JSON.stringify(miniAssets)};PRON.LOGO_SVG=${JSON.stringify(P.LOGO_SVG || '')};`

  // Уровень A0 — только модули оставленных тем.
  const levelChunk = chunks.find((c) => c.includes('PRON.addLevel(') && evalLevel(c).some((l) => l.id === LEVEL))
  if (!levelChunk) throw new Error(`нет уровня ${LEVEL}`)
  const level = evalLevel(levelChunk).find((l) => l.id === LEVEL)
  level.modules = level.modules.filter((m) => KEEP.includes(m.id))
  if (level.modules.length !== KEEP.length) throw new Error(`в ${LEVEL} нет модулей ${KEEP.join(', ')}`)
  const firstLine = levelChunk.split('\n')[0]
  const miniLevel = `${firstLine.startsWith('//') ? firstLine + ' Fixture: modules ' + KEEP.join(', ') + '.\n' : ''}PRON.addLevel(${JSON.stringify(level, null, 2)});`

  const topicChunks = KEEP.map((id) => {
    const c = chunks.find((x) => x.includes('PRON.addTopics(') && new RegExp(`\\bid"?\\s*:\\s*"${id.replace('.', '\\.')}"`).test(x))
    if (!c) throw new Error(`нет темы ${id}`)
    return c
  })
  const soundLab = chunks.find((c) => /^PRON\.sounds =/m.test(c))
  if (!soundLab) throw new Error('нет данных Sound Lab (PRON.sounds)')

  const mini = [miniHead, miniLevel, ...topicChunks, soundLab, ...engine]
  const miniEngine = mini.filter((c) => !isData(c)).join(SEP)
  const sha = crypto.createHash('sha256').update(miniEngine).digest('hex')
  const fullSha = crypto.createHash('sha256').update(engine.join(SEP)).digest('hex')
  if (sha !== fullSha) throw new Error('движок фикстуры разошёлся с прототипом')

  const open = html.indexOf('<style>')
  const close = html.indexOf('</style>', open)
  const style = html.slice(open + '<style>'.length, close).replace(/@font-face\{[^}]*\}/g, '')
  const out = [
    html.slice(0, open).replace('<title>Pronunciation World · Just To Study</title>', '<title>Pronunciation World (fixture)</title>') + `<style>${style}</style>`,
    '</head>',
    '<body>',
    '<div id="app"></div>',
    '<noscript>This section needs JavaScript.</noscript>',
    '',
    `<script>${mini.join(SEP)}</script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n')
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), out)

  // Бандл в форме контракта (спека, «Контракт»): данные — объектами, медиа — ссылками.
  const data = { window: {} }
  data.window.window = data.window
  vm.createContext(data.window)
  for (const c of mini.filter(isData)) vm.runInContext(c, data.window)
  const D = data.window.PRON
  const media = (keys, ext) => Object.fromEntries(keys.map((k) => [k, `/__pron-media/${encodeURIComponent(k)}.${ext}`]))
  const bundle = {
    release: 1,
    uploadedAt: '2026-10-28T00:00:00Z',
    levels: D.levels,
    topics: D.v2,
    sounds: D.sounds,
    soundLex: D.soundLex,
    featureText: D.featureText,
    soundTips: D.soundTips,
    assets: media(assetKeys, 'webp'),
    gameAudio: media(audioKeys, 'mp3'),
  }
  fs.writeFileSync(path.join(OUT, 'bundle.json'), JSON.stringify(bundle))
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
  console.log(`prototype-mini.html ${kb('prototype-mini.html')} КБ, bundle.json ${kb('bundle.json')} КБ; тем ${KEEP.length}, записей ${audioKeys.length}, картинок ${assetKeys.length}; движок ${sha}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
