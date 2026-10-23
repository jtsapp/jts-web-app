// Оракул «Prepositions World»: какие наборы вопросов собирает САМ прототип —
// порядок, варианты, ответы, scene-вопросы из геометрии сцен. Порт
// (src/practice/prepositions/engine.js) сверяется с этим файлом
// (engine.test.js): красный тест значит, что порт разъехался с исходником.
//
// Прототип исполняется в jsdom как есть (урезанная копия, Task 1), случайность
// — mulberry32 с одним сидом, сбрасываемым перед каждой сессией: shuffle
// прототипа и подбор неверных вариантов зависят от Math.random. Сессию
// открываем его же роутером (history.replaceState без hashchange — иначе
// route() сработал бы дважды и съел лишние случайные числа).
//
// Запуск: node scripts/prepositions/extract-oracle.js

const fs = require('node:fs')
const path = require('node:path')
const { JSDOM, VirtualConsole } = require('jsdom')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'prepositions', '__fixtures__')
const SEED = 42

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const or = (v) => (v === undefined ? null : v)
function shape(q) {
  return {
    id: or(q._id),
    type: q.type,
    stem: or(q.stem),
    text: or(q.text),
    lines: or(q.lines),
    opts: or(q.opts),
    ans: or(q.ans),
    gaps: q.gaps ? q.gaps.map((g) => ({ opts: g.opts, ans: g.ans })) : null,
    lesson: or(q.lesson),
    cat: or(q.cat),
  }
}

const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')
const vc = new VirtualConsole() // jsdom ругается на scrollTo — молчим
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    let rng = mulberry32(SEED)
    window.Math.random = () => rng()
    window.__seed = (s) => {
      rng = mulberry32(s)
    }
  },
})
const w = dom.window
const P = w.__PREP
if (!P) throw new Error('прототип не поднялся: нет window.__PREP')
for (const l of P.LES) P.MEM.done[l.id] = 1

const hashes = [
  ...P.LES.map((l) => `#/practice/lesson/${l.id}`),
  ...P.CATS.map((c) => `#/practice/cat/${c.id}`),
  '#/practice/final',
]
const sessions = {}
for (const h of hashes) {
  w.__seed(SEED)
  w.history.replaceState(null, '', h)
  P.route()
  if (!P.S) throw new Error(`сессия не собралась: ${h}`)
  sessions[h] = P.S.qs.map(shape)
}
fs.writeFileSync(path.join(DIR, 'oracle.json'), JSON.stringify({ seed: SEED, sessions }, null, 1))
console.log(Object.entries(sessions).map(([h, qs]) => `${h}: ${qs.length}`).join('\n'))
