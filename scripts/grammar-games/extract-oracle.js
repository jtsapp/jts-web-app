// Оракул «Грамматики · игр»: что считает САМ прототип — набор игр темы,
// пороги звёзд, поиск перевода слова, разбор строки на кликабельные слова,
// нормализацию набранного ответа и собранные наборы заданий каждой игры при
// одном и том же Math.random. Порт (src/practice/grammar-games/) сверяется с
// этим файлом: красный тест значит, что порт разъехался с исходником, и
// чинить надо порт.
//
// Прототип исполняется в jsdom как есть (урезанная копия, make-fixture.js),
// случайность — mulberry32 с одним сидом, сбрасываемым перед каждым набором:
// shuffle прототипа и выбор «верно / неверно» в «Гонке» зависят от Math.random.
//
// Запуск: node scripts/grammar-games/extract-oracle.js

const fs = require('node:fs')
const path = require('node:path')
const { JSDOM, VirtualConsole } = require('jsdom')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'grammar-games', '__fixtures__')
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

// Форма собранного набора — та же функция в engine.test.js. Диалог и «Лови правильное» не входят:
// у них нет набора на старте (варианты диалога тасуются по ходу реплик, облака — по таймеру).
const opts = (list) => list.map((o) => [o.x, !!o.ok])
const SHAPES = {
  pick: (R) => R.items.map((x) => ({ s: x.s, opts: opts(x.opts) })),
  trans: (R) => R.items.map((x) => ({ from: x.from, opts: opts(x.opts) })),
  match: (R) => R.cards.map((c) => [c.t, c.side, c.p]),
  sort: (R) => R.items.map((x) => [x.w, x.c]),
  build: (R) => ({ items: R.items.map((x) => x.s), pool: R.pool.map((p) => [p.w, !!p.extra]) }),
  fix: (R) => R.items.map((x) => x.s),
  place: (R) => R.items.map((x) => x.s),
  type: (R) => R.items.map((x) => x.s),
  listen: (R) => R.items.map((x) => ({ right: x.right, opts: opts(x.opts) })),
  race: (R) => R.items.map((x) => [x.s, x.truth]),
  boss: (R) => R.items.map((x) => ({ kind: x.kind, say: x.say, opts: opts(x.opts) })),
}

const LOOK = ['snakes', 'worked', 'better', '1st', '22nd', "i'm", "cats'", 'studies', 'stopped', 'making', 'bigger',
  'quickly', 'tallest', 'cried', 'running', 'xyz', 'am', 'is']
const WRAP = [
  "I'm twelve years old.",
  "She isn't at home / at school.",
  'He came 1st, she came 22nd.',
  '"Don\'t go!" — he said.',
  "The students' books are on the table.",
  'Is it 5 o\'clock?',
]
const NORM = ['  I’m   here. ', 'Hello!', 'don`t', 'A, B.', 'ok?!']

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
const GG = w.__GG
if (!GG) throw new Error('прототип не поднялся: нет window.__GG')

const ids = Object.keys(GG.TMAP)
const stages = Object.fromEntries(ids.map((id) => [id, GG.stagesOf(GG.TMAP[id])]))
const acc = []
for (const n of [8, 10, 12, 16]) for (let ok = 0; ok <= n; ok += 0.5) acc.push([ok, n, GG.acc(ok, n)])
const look = Object.fromEntries(LOOK.map((k) => [k, GG.look(k)]))
const wrap = Object.fromEntries(WRAP.map((s) => [s, GG.wrapEN(s)]))
const norm = Object.fromEntries(NORM.map((s) => [s, GG.norm(s)]))

const sets = {}
const raceSpeed = {}
for (const id of ids) {
  sets[id] = {}
  for (const g of stages[id]) {
    if (!SHAPES[g]) continue
    w.__seed(SEED)
    GG.G.topic = id
    GG.go('game', g)
    sets[id][g] = SHAPES[g](GG.R)
    if (g === 'race') raceSpeed[id] = GG.R.speed
  }
}
GG.go('hub')
w.close()

fs.writeFileSync(path.join(DIR, 'oracle.json'), JSON.stringify({ seed: SEED, stages, acc, look, wrap, norm, sets, raceSpeed }, null, 1))
console.log(ids.map((id) => `${id}: ${Object.keys(sets[id]).join(' ')}`).join('\n'))
console.log('шаг «Гонки»:', JSON.stringify(raceSpeed))
