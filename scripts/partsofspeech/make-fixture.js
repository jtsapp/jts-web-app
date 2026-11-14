// Копия прототипа «Parts of Speech World» для тестов: вход оракула
// (scripts/partsofspeech/extract-oracle.js), бандл для vitest и e2e, файл для
// ручной проверки заливки в админке (движок тот же байт в байт — админка
// покажет «движок совпадает»).
//
// Сам прототип (2.45 МБ, из них 1.5 МБ — восемнадцать webp в base64) в git не
// кладём. В копии ВСЕ блоки скрипта — и данных, и движка — те же байт в байт,
// кроме картинок блока 0: каждая — один и тот же пиксель webp (сигнатуру
// RIFF…WEBP проверяет бэкенд). Юниты и дела целиком, а не выборкой (спека
// просила урезать): блок 2 — не литерал, а конструкторы и правки задним числом,
// вырезать из него юнит текстом значит править прототип руками; зато оракул
// проходит все 55 упражнений и все 62 стадии, как у Tenses World.
//
// Бандл — в форме контракта (спека 2026-11-14-parts-of-speech-world-design.md,
// «Контракт: бандл»): блоки данных 1–3 исполняются по порядку в песочнице, где
// window — сам глобал (блок 2 пишет window.CASES=[] и тут же зовёт CASES.push),
// затем JSON.stringify внутри неё; svg сцен — функции без аргументов — там же
// вызываются и становятся строками, как это делает бэкенд. Картинки — ссылки
// /__partsofspeech-media/<имя>.webp (e2e отдаёт их через page.route).
//
// Запуск: node scripts/partsofspeech/make-fixture.js --html "<путь к прототипу>"

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'partsofspeech', '__fixtures__')
// sha256 движка файла 14.11.2026 (parts-of-speech.engine-sha бэкенда, спека «Хэш движка»).
const ENGINE_SHA = '2a4083f8b03a6b5376fb6844a4554fc08c806429c55044b9f21728471477c9aa'
const SEP = '\n;\n'
// Маркеры блоков данных (таблица спеки): блок с любым из них — данные, остальное — движок.
const DATA_MARKS = ['window.IMG=', 'window.WORLD=', 'window.CASES=[]', 'Object.assign(window.WHY_TL']
const IMAGES = ['hero', 'r_gate', 'r_nouns', 'r_lanterns', 'r_foundry', 'r_gardens', 'r_clockworks', 'r_isles', 'r_bridges', 'r_observatory', 'm_dexter', 'f_dexter', 'm_luna', 'f_luna', 'm_spark', 'f_spark', 'm_aizere', 'f_aizere']

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

const isData = (c) => DATA_MARKS.some((m) => c.includes(m))

/** Inline-скрипты в порядке файла. */
function scriptsOf(html) {
  const out = []
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) out.push({ attrs: m[1], body: m[2], start: m.index, end: re.lastIndex })
  return out
}

const plain = (s) => !/\btype\s*=/.test(s.attrs) && !/\bsrc\s*=/.test(s.attrs)
const blocksOf = (html) => scriptsOf(html).filter(plain).map((s) => s.body.replace(/\r\n?/g, '\n'))

/** sha256 движка по правилу спеки: блоки без type, переводы строк к \n, без блоков данных, склейка через «\n;\n». */
function engineSha(html) {
  const engine = blocksOf(html).filter((b) => !isData(b))
  return { sha: crypto.createHash('sha256').update(engine.join(SEP)).digest('hex'), count: engine.length }
}

/** Блоки движка (игра и оболочка) — для оракула. */
const engineBlocks = (html) => blocksOf(html).filter((b) => !isData(b))

// Что из песочницы уходит в бандл. svg сцены — функция: вызываем здесь же (у сцены без svg поля нет).
const DUMP = `(function(){
  var S = {};
  for (var k in window.SCENES) { var s = window.SCENES[k]; S[k] = { clues: s.clues }; if (typeof s.svg === 'function') S[k].svg = s.svg(); }
  var W = window.WORLD;
  return JSON.stringify({ WORLD: { MASCOTS: W.MASCOTS, REGIONS: W.REGIONS, STORY: W.STORY, SPOTS: W.SPOTS }, UNITS: UNITS, CASES: window.CASES,
    REFS: window.REFS, HOWTO: window.HOWTO, SCENES: S, GAME_INTRO: window.GAME_INTRO, GAME_DOSSIER: window.GAME_DOSSIER });
})()`

/** Исполнить блоки данных 1–3 без DOM. Блок 0 (картинки, 1.5 МБ одной строкой) не исполняется — читается как JSON. */
function runData(html) {
  const box = vm.createContext({})
  vm.runInContext('var window = this; window.IMG = {};', box)
  const blocks = blocksOf(html).filter((b) => isData(b) && !b.includes('window.IMG='))
  if (blocks.length !== 3) throw new Error(`блоков данных ${blocks.length}, ждали 3`)
  blocks.forEach((b, i) => vm.runInContext(b, box, { filename: `data-${i + 1}.js`, timeout: 10000 }))
  return JSON.parse(vm.runInContext(DUMP, box))
}

/** Картинки блока 0: { имя: data-URI }. */
function imagesOf(html) {
  const block = blocksOf(html).find((b) => b.includes('window.IMG='))
  if (!block) throw new Error('нет блока window.IMG=')
  const at = block.indexOf('window.IMG=') + 'window.IMG='.length
  const json = block.slice(at).trim().replace(/;\s*$/, '')
  return JSON.parse(json)
}

function counts(d) {
  const acts = d.UNITS.reduce((n, u) => n + (u.acts || []).length, 0)
  const actItems = d.UNITS.reduce((n, u) => n + (u.acts || []).reduce((k, a) => k + (a.items || []).length, 0), 0)
  const stages = d.CASES.reduce((n, c) => n + c.stages.length, 0)
  const stageItems = d.CASES.reduce((n, c) => n + c.stages.reduce((k, s) => k + (s.items || []).length, 0), 0)
  return { regions: d.WORLD.REGIONS.length, units: d.UNITS.length, acts, actItems, cases: d.CASES.length, stages, stageItems, scenes: Object.keys(d.SCENES).length }
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу Parts of Speech World>')
  const sharp = require('sharp')
  const html = fs.readFileSync(src, 'utf8').replace(/\r\n?/g, '\n')
  const full = engineSha(html)
  if (full.count !== 2) throw new Error(`блоков движка ${full.count}, ждали 2`)
  if (full.sha !== ENGINE_SHA) console.warn(`ВНИМАНИЕ: движок прототипа ${full.sha} ≠ перенесённого на сайт ${ENGINE_SHA} — порт надо обновить`)
  const names = Object.keys(imagesOf(html))
  const missing = IMAGES.filter((n) => !names.includes(n))
  if (missing.length) throw new Error(`в прототипе нет картинок: ${missing.join(', ')}`)

  const pixel = await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 135, g: 75, b: 248, alpha: 1 } } })
    .webp({ quality: 50 })
    .toBuffer()
  const pixelUri = 'data:image/webp;base64,' + pixel.toString('base64')

  // Сборка копии: меняем только data-URI картинок блока 0, остальное — как в файле.
  let out = ''
  let at = 0
  let swapped = 0
  for (const s of scriptsOf(html)) {
    let body = s.body
    if (plain(s) && body.includes('window.IMG=')) {
      body = body.replace(/data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+/g, () => {
        swapped++
        return pixelUri
      })
    }
    out += html.slice(at, s.start) + `<script${s.attrs}>${body}</script>`
    at = s.end
  }
  out += html.slice(at)
  out = out.replace('<title>Parts of Speech World — Just to Study</title>', '<title>Parts of Speech World (fixture)</title>')
  if (swapped !== names.length) throw new Error(`картинок заменено ${swapped}, в блоке ${names.length}`)

  const mini = engineSha(out)
  if (mini.sha !== full.sha) throw new Error('движок копии разошёлся с прототипом')
  const data = runData(out)
  if (JSON.stringify(runData(html)) !== JSON.stringify(data)) throw new Error('данные копии разошлись с прототипом')

  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), out)
  const IMG = {}
  for (const n of names) IMG[n] = `/__partsofspeech-media/${n}.webp`
  const bundle = { release: 1, uploadedAt: '2026-11-14T00:00:00Z', IMG, ...data }
  fs.writeFileSync(path.join(OUT, 'bundle.json'), JSON.stringify(bundle))

  const c = counts(data)
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
  console.log(
    `prototype-mini.html ${kb('prototype-mini.html')} КБ, bundle.json ${kb('bundle.json')} КБ; картинок ${names.length}, регионов ${c.regions}, юнитов ${c.units}, ` +
      `упражнений ${c.acts} (${c.actItems} заданий), дел ${c.cases}, стадий ${c.stages} (${c.stageItems} заданий), сцен ${c.scenes}; движок ${mini.sha}`,
  )
}

module.exports = { engineSha, engineBlocks, runData, imagesOf, isData, counts, ENGINE_SHA, IMAGES }

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
