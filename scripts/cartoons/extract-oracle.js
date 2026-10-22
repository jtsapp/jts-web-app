// Оракул «Cartoon World»: что показывает и как отвечает САМ прототип. Порт
// (src/practice/cartoons/engine.js) сверяется с этим файлом в engine.test.js:
// красный тест значит, что порт разъехался с исходником.
//
// Два среза:
// - библиотека: какие видео и в каком порядке стоят на полках уровней при наборе
//   фильтров (поиск, аудитория, уровни, тема, длительность) и счётчики кнопок.
//   Прототип исполняется в jsdom как есть (урезанная копия), фильтры ставятся
//   через window.JTSCartoons — его же отладочный выход;
// - миссии: какой заготовленный ответ персонажа выбирает pickPath на текст ученика.
//   pickPath — замыкание движка, наружу не выставлен; его текст (и нужный ему esc)
//   вырезается из скрипта счётом скобок и исполняется в node:vm.
//
// Запуск: node scripts/cartoons/extract-oracle.js

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { JSDOM, VirtualConsole } = require('jsdom')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'cartoons', '__fixtures__')
const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')

// ---------- библиотека ----------
const FILTERS = [
  {},
  { levels: ['A0'] },
  { levels: ['A1', 'B1'] },
  { audience: 'kids' },
  { audience: 'adults' },
  { audience: 'teens', levels: ['B2'] },
  { q: 'peppa' },
  { q: 'камп' },
  { length: 'short' },
  { length: 'long' },
  { topic: 'friendship' },
]

const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() })
const w = dom.window
const C = w.JTSCartoons
if (!C) throw new Error('прототип не поднялся: нет window.JTSCartoons')

function shelves() {
  return [...w.document.querySelectorAll('#ct-grid .ct-shelf')].map((s) => ({
    level: s.getAttribute('data-shelf'),
    ids: [...s.querySelectorAll('a.ct-card__link')].map((a) => decodeURIComponent(a.getAttribute('href').slice('#watch/'.length))),
  }))
}
function chips() {
  const text = (sel) => [...w.document.querySelectorAll(sel)].map((b) => b.textContent.replace(/\s+/g, ' ').trim())
  return { audience: text('#ct-aud-chips button'), levels: text('#ct-level-chips button') }
}

const library = FILTERS.map((f) => {
  C.state.filters = { q: '', levels: [], topic: '', audience: '', length: '', ...f }
  C.Library.buildControls()
  C.Library.render()
  return { filters: f, shelves: shelves(), chips: chips(), empty: !w.document.getElementById('ct-empty').hidden }
})
w.close()

// ---------- pickPath ----------
function sliceFunction(src, name) {
  const at = src.indexOf(`function ${name}(`)
  if (at < 0) throw new Error(`нет function ${name}`)
  let d = 0
  for (let j = src.indexOf('{', at); j < src.length; j++) {
    if (src[j] === '{') d++
    else if (src[j] === '}' && --d === 0) return src.slice(at, j + 1)
  }
  throw new Error(`незакрытая function ${name}`)
}
const engine = html.slice(html.lastIndexOf('<script>') + 8)
const ctx = vm.createContext({})
vm.runInContext(sliceFunction(engine, 'esc') + '\n' + sliceFunction(engine, 'pickPath'), ctx)

const missions = JSON.parse(fs.readFileSync(path.join(DIR, 'missions.json'), 'utf8'))
const cases = []
for (const [id, m] of Object.entries(missions)) {
  m.chat.turns.forEach((turn, ti) => {
    if (!turn.paths) return
    const texts = []
    turn.paths.forEach((p) => {
      const kw = (p.kw || []).filter((k) => String(k).trim().length >= 2)
      if (kw.length) texts.push(`Well, I think ${kw[0]}s are fine and ${kw[kw.length - 1]} too.`)
      if (kw.length > 1) texts.push(`${kw[1].toUpperCase()}! Maybe ${kw[0]}.`)
    })
    texts.push('I do not know what to say here, sorry.')
    texts.push('Мне кажется, что это интересно.')
    for (const text of texts) {
      const r = vm.runInContext(`pickPath(${JSON.stringify(turn)}, ${JSON.stringify(text)})`, ctx)
      cases.push({ mission: id, turn: ti, text, i: r.i, word: r.word })
    }
  })
}

fs.writeFileSync(path.join(DIR, 'oracle.json'), JSON.stringify({ library, pickPath: cases }, null, 1))
console.log(`полок: ${library.map((l) => l.shelves.length).join(',')}; pickPath: ${cases.length} случаев, без совпадения ${cases.filter((c) => c.i < 0).length}`)
