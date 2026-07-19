// Извлекает тексты 10 сказок из движка «Fairytale's World»
// (public/practice/fairytales.html) в JSON для нативной читалки Практики:
//   public/practice/tales/index.json — каталог [{id,title,author,level,chapters}]
//   public/practice/tales/<id>.json  — {book,chapters:[{num,title,text}],dict:{}}
//
// Скрипт движка выполняется в VM с заглушками DOM (Proxy, проглатывающий любые
// обращения) — так данные packs (главы, нарация, диалоги) достаются без
// браузера и без ручного парсинга 2.7 МБ JS. Текст главы собирается из beats
// основного сюжетного пути (первый playable-персонаж — это и есть сама
// сказка; остальные пути — альтернативные POV той же истории), финал — из
// ending. Словарей у сказок нет — тап-перевод работает через gtx-фолбэк.
// Запуск: node scripts/extract-tales.js
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'public/practice/fairytales.html')
const OUT = path.join(ROOT, 'public/practice/tales')

const html = fs.readFileSync(SRC, 'utf8')
const scriptStart = html.lastIndexOf('<script>')
const scriptEnd = html.lastIndexOf('</script>')
if (scriptStart === -1 || scriptEnd <= scriptStart) throw new Error('не найден <script> движка')
let src = html.slice(scriptStart + '<script>'.length, scriptEnd)
if (!src.includes('const TALES')) throw new Error('в скрипте нет const TALES — структура изменилась')
src += '\n;__CAPTURE__({ TALES })\n'

// Proxy-заглушка: любое свойство/вызов возвращают такую же заглушку — движку
// при инициализации хватает, чтобы не упасть (канвас, звук, DOM).
function absorbing(name) {
  const fn = function () {}
  return new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0
      if (p === 'toString') return () => ''
      return absorbing(name + '.' + String(p))
    },
    apply: () => absorbing(name + '()'),
    construct: () => absorbing('new ' + name),
    set: () => true,
  })
}

let captured = null
const sandbox = {
  __CAPTURE__: (x) => {
    captured = x
  },
  console: { log() {}, warn() {}, error() {} },
  Math, JSON, Date, Array, Object, String, Number, Boolean, RegExp, Promise,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  document: absorbing('document'),
  navigator: absorbing('navigator'),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  speechSynthesis: absorbing('speech'),
  SpeechSynthesisUtterance: function () {},
  Audio: function () { return absorbing('audio') },
  Image: function () { return absorbing('image') },
  AudioContext: function () { return absorbing('ac') },
  fetch: () => new Promise(() => {}),
  location: absorbing('location'),
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {}, removeEventListener() {},
  innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
  screen: { width: 1440, height: 900 },
  performance: { now: () => 0 },
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
}
sandbox.window = sandbox
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(src, sandbox, { filename: 'fairytales-engine.js' })
if (!captured?.TALES?.length) throw new Error('TALES не захвачены')

const en = (l) => (typeof l === 'string' ? l : l?.en || '')

// Реплика диалога: «Kay: “The roses are open, Gerda!”»
function dialogLine(names, d) {
  const who = en(names?.[d.who]?.name || names?.[d.who]) || (d.who ? d.who[0].toUpperCase() + d.who.slice(1) : '')
  const line = en(d.line)
  if (!line) return ''
  return who ? `${who}: “${line}”` : line
}

function chapterText(pack, ch) {
  const paras = []
  for (const b of ch.beats || []) {
    if (b.narr) {
      const p = en(b.narr)
      if (p) paras.push(p)
    }
    if (b.dialog) {
      for (const d of b.dialog) {
        const l = dialogLine(pack.names, d)
        if (l) paras.push(l)
      }
    }
  }
  return paras.join('\n')
}

fs.mkdirSync(OUT, { recursive: true })
const index = []
for (const pack of captured.TALES) {
  const mainKey = pack.playable?.[0]?.key || Object.keys(pack.story)[0]
  const storyPath = pack.story[mainKey]
  const chapters = (storyPath.chapters || []).map((ch, i) => ({
    num: i + 1,
    title: en(ch.title) || `Chapter ${i + 1}`,
    text: chapterText(pack, ch),
  }))
  const ending = storyPath.ending
  if (ending && en(ending.text)) {
    chapters.push({ num: chapters.length + 1, title: en(ending.title) || 'Ending', text: en(ending.text) })
  }
  if (chapters.length < 2 || chapters.some((c) => !c.text)) {
    throw new Error(`${pack.id}: пустые главы — проверь структуру движка`)
  }
  const book = { id: pack.id, title: en(pack.meta?.title) || pack.id, author: '', level: '' }
  fs.writeFileSync(path.join(OUT, `${pack.id}.json`), JSON.stringify({ book, chapters, dict: {} }))
  index.push({ ...book, chapters: chapters.length })
  console.log(`${pack.id}: ${chapters.length} глав («${book.title}»)`)
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index))
console.log(`\nСказок: ${index.length} → ${OUT}`)
