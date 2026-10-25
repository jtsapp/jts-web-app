// Оракул Скорочтения: что считает САМ прототип кабинета — выравнивание прочитанного с текстом (srAlign),
// процент, звёзды и темп на экране итога, подпись скорости и длительность прокрутки телесуфлёра. Порт
// (src/practice/speed-reading/rules.js) сверяется с этим файлом: красный rules.test.js значит, что порт
// разъехался с исходником, и чинить надо порт.
//
// Функции вырезаются из html по имени (scripts/lib/js-slice.js) и исполняются в node:vm с заглушками
// окружения: экран итога и стартовый экран отрисовываются в строку, цифры берутся из неё — так проверяется
// то, что ученик видит, а не наш пересказ формул. Длительность прокрутки — выражение `total` из srRecord.
//
// Запуск: node scripts/speed-reading/extract-oracle.js [--html data/jts-student-cabinet.html]

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { sliceConst, sliceFunction } = require('../lib/js-slice.js')

const ROOT = path.join(__dirname, '..', '..')
const OUT = path.join(ROOT, 'src', 'practice', 'speed-reading', '__fixtures__', 'oracle.json')

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function must(re, src, what) {
  const m = re.exec(src)
  if (!m) throw new Error(`в прототипе не найдено: ${what}`)
  return m
}

function loadPrototype(html) {
  const consts = must(/const SR_BASE=150,SR_SPEEDS=\[[^\]]*\];/, html, 'SR_BASE/SR_SPEEDS')[0]
  const total = must(/const total=([^;]+);/, sliceFunction(html, 'srRecord'), 'total в srRecord')[1]
  const code = [
    sliceConst(html, 'SR_TEXTS'),
    consts,
    "let SR={step:'start',text:'flight',mult:1,wpm:SR_BASE,tries:[]}",
    sliceConst(html, 'srWords'),
    sliceConst(html, 'srNorm'),
    sliceFunction(html, 'srText'),
    sliceFunction(html, 'srSetMult'),
    sliceFunction(html, 'srAlign'),
    sliceFunction(html, 'pSpeed'),
    sliceFunction(html, 'srResultView'),
    `function srTotal(){return ${total};}`,
    'globalThis.__SR = { SR_TEXTS, SR_BASE, SR_SPEEDS, srWords, srNorm, srText, srSetMult, srAlign, pSpeed, srResultView, srTotal, state: () => SR, set: (s) => { SR = s } }',
  ].join(';\n')
  const ctx = {
    G: { lang: 'ru' },
    X: (ru) => ru,
    L: (o) => (o == null ? '' : typeof o === 'string' ? o : o.ru),
    esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
    IMG: { dexter: '', cheer: '', sleep: '' },
    sCoin: () => '',
    SRL: null,
    render: () => {},
    srListenStop: () => {},
    navigator: { mediaDevices: { getUserMedia() {} } },
    window: { MediaRecorder: function MediaRecorder() {} },
    Math,
    String,
    Array,
    Date,
  }
  vm.createContext(ctx)
  vm.runInContext(code, ctx)
  return ctx.__SR
}

// Наборы «что услышал распознаватель» — те случаи, на которых выравнивание и ошибается, и прощает.
function heardSets(words) {
  const n = words.length
  return {
    all: words.slice(),
    skip: words.filter((_, i) => i < 10 || i > 20),
    extra: words.flatMap((w, i) => (i % 7 === 3 ? [w, ['um', 'uh', 'like'][i % 3]] : [w])),
    repeat: words.flatMap((w, i) => (i % 5 === 0 ? [w, w] : [w])),
    prefix: words.map((w) => (w.replace(/[^a-z]/gi, '').length > 4 ? w.slice(0, 4) + 'xyz' : w)),
    half: words.slice(0, Math.floor(n / 2)),
    empty: [],
    caseAndPunct: words.map((w, i) => (i % 2 ? w.toUpperCase() + '!' : w.replace(/[.,!?;]/g, ''))),
    jump: [...words.slice(0, 10), ...words.slice(20)],
  }
}

function build(html) {
  const P = loadPrototype(html)
  const texts = P.SR_TEXTS.map((t) => ({ id: t.id, words: P.srWords(t.x).length }))

  const align = []
  for (const t of P.SR_TEXTS) {
    const words = P.srWords(t.x)
    for (const [kind, heard] of Object.entries(heardSets(words))) {
      P.set({ ...P.state(), words, heard })
      align.push({ text: t.x, kind, heard, ok: P.srAlign() })
    }
  }

  const results = []
  const view = (tr) => {
    P.set({ ...P.state(), last: tr, tries: [tr] })
    const html2 = P.srResultView()
    const pct = /Прочитано (\d+)%/.exec(html2)
    const stars = />(★*)<span style="opacity:\.35">/.exec(html2)
    const wpm = /твой темп (\d+)/.exec(html2)
    return { pct: pct ? Number(pct[1]) : null, stars: stars ? stars[1].length : null, wpm: wpm ? Number(wpm[1]) : null }
  }
  for (const words of [80, 117]) {
    for (const read of [0, 1, 23, 24, 47, 48, 67, 68, 80, null]) {
      if (read != null && read > words) continue
      for (const dur of [0, 12.4, 40, 61.7]) {
        const tr = { text: 'hello', mult: 1, wpm: 150, dur, words, read, ok: [], url: null, at: new Date(0) }
        results.push({ read, words, dur, ...view(tr) })
      }
    }
  }

  const pace = []
  for (const t of P.SR_TEXTS) {
    for (const mult of P.SR_SPEEDS) {
      P.set({ ...P.state(), step: 'start', text: t.id })
      P.srSetMult(mult)
      const m = /· (\d+) сл\/мин · ≈ (\d+) секунд/.exec(P.pSpeed())
      if (!m) throw new Error(`нет подписи скорости у ${t.id} ${mult}x`)
      P.set({ ...P.state(), words: P.srWords(t.x) })
      pace.push({ text: t.id, mult, wpm: Number(m[1]), seconds: Number(m[2]), totalMs: P.srTotal() })
    }
  }

  return { source: 'data/jts-student-cabinet.html', speeds: P.SR_SPEEDS, base: P.SR_BASE, texts, align, results, pace }
}

if (require.main === module) {
  const html = fs.readFileSync(path.resolve(ROOT, arg('--html', 'data/jts-student-cabinet.html')), 'utf8')
  const oracle = build(html)
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(oracle) + '\n')
  console.log(`оракул: align ${oracle.align.length}, results ${oracle.results.length}, pace ${oracle.pace.length} → ${path.relative(ROOT, OUT)}`)
}

module.exports = { build }
