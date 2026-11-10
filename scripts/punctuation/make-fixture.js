// Урезанная копия прототипа «Punctuation World» для тестов: вход оракула
// (scripts/punctuation/extract-oracle.js), бандл для vitest и e2e, файл для
// ручной проверки заливки в админке (движок тот же байт в байт — админка
// покажет «движок совпадает»).
//
// Сам прототип (2.7 МБ, почти всё — base64 картинок и шрифта Onest) в git не
// кладём. Копия: две страницы — 1 (точка, остров A1) и 7 (апостроф, A2): у
// первой — камни, ворота и плоты, у седьмой — «ключи» слов (cue.word: вариант
// подставляется в слово) и задание на смысл (MEANING), а повторение со стадии 3
// берёт её правила из страницы 1. Строки BANK и MEANING — только этих страниц
// (в тексте литерала, с комментариями автора); CUE — целиком, как в файле: это
// JS-литерал с ключами без кавычек, и разборщик бэкенда должен видеть его
// настоящим. Картинки — все 32 ключа, каждая 8×8 (движок ждёт каждую по имени,
// бэкенд предупредил бы о пропавшей). Шрифты (@font-face Onest) из <style>
// выброшены: сайт рисует раздел своим шрифтом.
//
// Границы данных — по спеке (§«Хэш движка»): объявление const NAME=… от const
// до своего «;» (узел VariableDeclaration). Объявления заменяются на месте, всё
// между ними — движок — не меняется ни на байт; сверка хэша ниже.
//
// Запуск: node scripts/punctuation/make-fixture.js --html "<путь к прототипу>"

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const acorn = require('acorn')
const sharp = require('sharp')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'punctuation', '__fixtures__')
const KEEP = [1, 7]
const DATA = ['ASSET', 'ART', 'ADV_ART', 'ADV_ART2', 'LOGO_SVG', 'LESSONS', 'CUE', 'BANK', 'MEANING']
const IMAGES = ['ASSET', 'ART', 'ADV_ART', 'ADV_ART2']

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

/** Объявления данных верхнего уровня: имя → [start, end) в тексте скрипта. */
function declarations(script) {
  const ast = acorn.parse(script, { ecmaVersion: 'latest', sourceType: 'script' })
  const out = {}
  for (const node of ast.body) {
    if (node.type !== 'VariableDeclaration' || node.kind !== 'const') continue
    const names = node.declarations.map((d) => d.id.name)
    const hit = names.filter((n) => DATA.includes(n))
    if (!hit.length) continue
    if (names.length !== 1) throw new Error(`в одном объявлении несколько имён: ${names.join(', ')}`)
    out[hit[0]] = [node.start, node.end]
  }
  return out
}

/** Остаток скрипта без объявлений данных — то, от чего считается хэш движка. */
function engineOf(script) {
  const d = declarations(script)
  const cuts = Object.values(d).sort((a, b) => a[0] - b[0])
  let rest = ''
  let pos = 0
  for (const [s, e] of cuts) {
    rest += script.slice(pos, s)
    pos = e
  }
  return rest + script.slice(pos)
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')

/** Значение объявления: литерал исполняется в пустом контексте — чистые данные, без ссылок на движок. */
function valueOf(text) {
  const box = {}
  vm.createContext(box)
  vm.runInContext(text.replace(/^const /, 'var '), box)
  return box[text.match(/^const ([A-Z_0-9]+)=/)[1]]
}

/** Строки литерала-массива (BANK, MEANING) только оставленных страниц: строки — как у автора, с комментариями. */
function keepRows(text, name) {
  const lines = text.split('\n')
  if (lines[0] !== `const ${name}=[` || lines.at(-1) !== '];') throw new Error(`${name}: литерал не в построчном виде`)
  const body = lines.slice(1, -1)
  const kept = []
  let section = null // страница последнего комментария «/* N · … */»
  for (const line of body) {
    const head = line.match(/^\/\* (\d+) · /)
    if (head) {
      section = +head[1]
      if (KEEP.includes(section)) kept.push(line)
      continue
    }
    const row = line.match(/^\s*\[(\d+),/)
    if (!row) throw new Error(`${name}: непонятная строка ${line.slice(0, 60)}`)
    if (KEEP.includes(+row[1])) kept.push(line.replace(/,\s*$/, ''))
  }
  // запятая — после каждой строки-массива, кроме последней (у автора последняя строка — без запятой)
  const isComment = (l) => /^\/\*/.test(l)
  const lastRow = kept.map((l) => !isComment(l)).lastIndexOf(true)
  const fixed = kept.map((l, i) => (isComment(l) || i === lastRow ? l : `${l},`))
  return [`const ${name}=[`, ...fixed, '];'].join('\n')
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу Punctuation World>')
  const html = fs.readFileSync(src, 'utf8').replace(/\r\n?/g, '\n')
  const open = html.indexOf('<script>')
  const close = html.indexOf('</script>', open)
  if (open < 0 || close < 0 || html.indexOf('<script>', close) >= 0) throw new Error('ждали ровно один inline <script>')
  const script = html.slice(open + '<script>'.length, close)
  const decl = declarations(script)
  for (const n of DATA) if (!decl[n] && n !== 'ADV_ART2') throw new Error(`нет объявления ${n}`)
  const text = (n) => (decl[n] ? script.slice(...decl[n]) : null)

  // Картинка — своя у каждого ключа (8×8 своего цвета): оракул сверяет, КАКУЮ картинку движок поставил (позы
  // Декстера, фоны стадий), а одинаковые пиксели этого бы не различили.
  let hue = 0
  const tinyUri = async () => {
    hue += 1
    const bg = { r: (hue * 37) % 256, g: (hue * 71) % 256, b: (hue * 113) % 256, alpha: 1 }
    const buf = await sharp({ create: { width: 8, height: 8, channels: 4, background: bg } }).webp({ lossless: true }).toBuffer()
    return 'data:image/webp;base64,' + buf.toString('base64')
  }

  const mini = {}
  for (const n of IMAGES) {
    if (!decl[n]) continue
    const v = valueOf(text(n))
    const out = {}
    for (const k of Object.keys(v)) out[k] = await tinyUri()
    mini[n] = `const ${n}=${JSON.stringify(out)};`
  }
  mini.LOGO_SVG = text('LOGO_SVG')
  const lessons = valueOf(text('LESSONS'))
  const topics = lessons.TOPICS.filter((t) => KEEP.includes(t.id))
  if (topics.length !== KEEP.length) throw new Error(`нет страниц ${KEEP.join(', ')}`)
  const lx = Object.fromEntries(KEEP.map((id) => [id, lessons.LX[id]]))
  mini.LESSONS = `const LESSONS=${JSON.stringify({ SOURCES: lessons.SOURCES, TOPICS: topics, LX: lx })};`
  mini.CUE = text('CUE')
  mini.BANK = keepRows(text('BANK'), 'BANK')
  mini.MEANING = keepRows(text('MEANING'), 'MEANING')

  // Новый скрипт: объявления — на своих местах, между ними — движок как был.
  const order = Object.entries(decl).sort((a, b) => a[1][0] - b[1][0])
  let out = ''
  let pos = 0
  for (const [n, [s, e]] of order) {
    out += script.slice(pos, s) + mini[n]
    pos = e
  }
  out += script.slice(pos)
  const full = sha(engineOf(script))
  const got = sha(engineOf(out))
  if (got !== full) throw new Error('движок фикстуры разошёлся с прототипом')

  // Данные фикстуры — исполнением её же объявлений.
  const D = Object.fromEntries(DATA.filter((n) => mini[n]).map((n) => [n, valueOf(mini[n])]))
  const bank = D.BANK.filter((r) => KEEP.includes(r[0]))
  if (bank.length !== D.BANK.length || !bank.length) throw new Error('BANK урезан не по страницам')
  const pages = new Set(D.BANK.map((r) => r[0]))
  for (const id of KEEP) if (!pages.has(id)) throw new Error(`у страницы ${id} нет строк BANK`)

  const sOpen = html.indexOf('<style>')
  const sClose = html.indexOf('</style>', sOpen)
  const style = html.slice(sOpen + '<style>'.length, sClose).replace(/@font-face\{[^}]*\}\n?/g, '')
  const page =
    html
      .slice(0, sOpen)
      .replace('<title>Punctuation World · Just To Study</title>', '<title>Punctuation World (fixture)</title>') +
    `<style>${style}</style>` +
    html.slice(sClose + '</style>'.length, open) +
    `<script>${out}</script>` +
    html.slice(close + '</script>'.length)
  if (!page.includes('<title>Punctuation World (fixture)</title>')) throw new Error('не нашёлся <title> прототипа')
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), page)

  // Бандл в форме контракта (спека, «Контракт: бандл»): данные — как в прототипе, картинки — ссылками.
  const bundle = bundleOf(D)
  fs.writeFileSync(path.join(OUT, 'bundle.json'), JSON.stringify(bundle))
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
  const images = IMAGES.reduce((a, n) => a + Object.keys(D[n] || {}).length, 0)
  console.log(
    `prototype-mini.html ${kb('prototype-mini.html')} КБ, bundle.json ${kb('bundle.json')} КБ; страниц ${topics.length}, строк BANK ${D.BANK.length}, MEANING ${D.MEANING.length}, CUE ${Object.keys(D.CUE).length}, картинок ${images}; движок ${got}`,
  )
}

/** Имя картинки — по её содержимому, как у бэкенда (practice/punctuation/<sha24>.webp): одинаковые — одна ссылка. */
const mediaName = (dataUri) => `/__punct-media/${sha(dataUri).slice(0, 24)}.webp`

/**
 * Бандл контракта из данных прототипа (объекты объявлений): картинки — ссылками, логотипа нет. Его же собирает
 * engine.test.js из полного прототипа (PUNCTUATION_HTML).
 */
function bundleOf(D) {
  const media = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, mediaName(v)]))
  return {
    release: 1,
    uploadedAt: '2026-11-10T00:00:00Z',
    ASSET: media(D.ASSET),
    ART: media(D.ART),
    ADV_ART: media(D.ADV_ART),
    ADV_ART2: media(D.ADV_ART2),
    LESSONS: D.LESSONS,
    CUE: D.CUE,
    BANK: D.BANK,
    MEANING: D.MEANING,
  }
}

/** Данные полного или урезанного прототипа (html) — объектами объявлений. */
function dataOf(html) {
  const script = html.replace(/\r\n?/g, '\n').match(/<script>([\s\S]*?)<\/script>/)[1]
  const decl = declarations(script)
  return Object.fromEntries(Object.entries(decl).map(([n, [s, e]]) => [n, valueOf(script.slice(s, e))]))
}

module.exports = { declarations, engineOf, sha, mediaName, bundleOf, dataOf }

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
