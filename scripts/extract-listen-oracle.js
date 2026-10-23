#!/usr/bin/env node
// Оракул Just to Listen: функции сверки ответа считает САМ прототип
// (data/jtslisten.html), порт src/practice/listen/ сверяется с ними, а не сам
// с собой (тот же приём, что у «Чтения», «Воркбука», «Глаголов»).
//
// Одно сознательное расхождение: SYN и IRR прототипа — обычные объекты, и
// слово, совпавшее с унаследованным ключом (constructor, toString…), читало
// из них функцию. На термине «constructor» (Software Development) проверка
// предложения падала TypeError. Порт смотрит только собственные ключи, и
// оракул считается с тем же исправлением.
//
// Запуск: node scripts/extract-listen-oracle.js [путь к html]
// Пишет src/practice/listen/__fixtures__/oracle.json.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { sliceFunction, sliceConst } = require('./lib/js-slice.js')

const ROOT = path.join(__dirname, '..')
const DEFAULT_SRC = path.join(ROOT, 'data', 'jtslisten.html')
const OUT = path.join(ROOT, 'src', 'practice', 'listen', '__fixtures__', 'oracle.json')

const CONSTS = ['letters', 'enMain', 'CONTR', 'SYN', 'IRR', 'PART', 'SYL', 'FIELDS']
const FUNCS = ['lev', 'toks', 'forms', 'containsTarget', 'compareSentence', 'missingWords', 'parts']
// Таблицы-словари, которые прототип читает по слову ученика: SYN[t], IRR[w].
const LOOKUPS = ['SYN', 'IRR']
// Каждая N-я запись направлений: все 8 тыс. раздули бы фикстуру до мегабайтов,
// а формы и сокращения там те же, что у уровней.
const FIELD_STEP = 10
// Разбор на слова — у каждой 4-й записи, искажения ответа — у каждой 6-й,
// опечатки слова — у каждой 3-й: по той же причине (фикстура ~1 МБ, а не 4).
const TOKS_STEP = 4
const PERTURB_STEP = 6
const TYPO_STEP = 3

function readPrototype(html) {
  const src = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'))
  const ctx = vm.createContext({})
  const consts = CONSTS.map((n) => {
    const decl = sliceConst(src, n)
    if (!LOOKUPS.includes(n)) return decl
    // Исправление унаследованных ключей (см. шапку): таблицы без прототипа.
    return decl.replace(new RegExp(`^const ${n}\\s*=`), `const ${n} = Object.assign(Object.create(null),`) + ')'
  })
  vm.runInContext([...consts, ...FUNCS.map((n) => sliceFunction(src, n))].join('\n'), ctx, { timeout: 20000 })
  return vm.runInContext(
    '({SYL, FIELDS, letters, enMain, lev, toks, containsTarget, compareSentence, missingWords, parts})',
    ctx,
  )
}

// Детерминированные искажения ответа: то, что ученик реально пишет на слух.
const CONTRACT = [
  [/\bdo not\b/g, "don't"], [/\bdoes not\b/g, "doesn't"], [/\bis not\b/g, "isn't"], [/\bI am\b/g, "I'm"],
  [/\bwill not\b/g, "won't"], [/\bcannot\b/g, "can't"], [/\bit is\b/gi, "it's"], [/\bwe are\b/gi, "we're"],
]
const SPELLING = [[/colour/g, 'color'], [/neighbour/g, 'neighbor'], [/\bmum\b/g, 'mom'], [/ise\b/g, 'ize'], [/\bfilm\b/g, 'movie']]

function perturbations(ref, word) {
  const words = ref.split(' ')
  const out = [
    ref,
    ref.toLowerCase().replace(/[.,!?;:]/g, ''),
    words.slice(0, -1).join(' '),
    words.length > 1 ? [words[1], words[0], ...words.slice(2)].join(' ') : ref + ' too',
    CONTRACT.reduce((s, [r, v]) => s.replace(r, v), ref),
    SPELLING.reduce((s, [r, v]) => s.replace(r, v), ref),
    ref.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), 'something'),
    ref + ' really',
  ]
  return [...new Set(out)].filter(Boolean)
}

function wordTypos(w) {
  const t = w.replace(/[^a-z]/gi, '').toLowerCase()
  if (t.length < 2) return []
  const mid = Math.floor(t.length / 2)
  return [...new Set([t.slice(0, -1), t.slice(0, mid - 1) + t[mid] + t[mid - 1] + t.slice(mid + 1), t + 'e', 'x' + t.slice(1)])]
}

function entries(P) {
  const levels = Object.values(P.SYL).flatMap((units) => units.flatMap((u) => u.lessons.flatMap((l) => l.w)))
  const fields = P.FIELDS.flatMap((f) => f.units.flatMap((u) => u.lessons.flatMap((l) => l.w)))
  return [...levels, ...fields.filter((_, i) => i % FIELD_STEP === 0)]
}

function build(P) {
  const rows = { toks: [], contains: [], compare: [], missing: [], lev: [], parts: [] }
  entries(P).forEach(([en, , exEn], i) => {
    const ref = exEn.split('||')[0]
    if (i % TOKS_STEP === 0) rows.toks.push([ref, P.toks(ref)])
    rows.contains.push([ref, en, P.containsTarget(ref, en)])
    const target = P.letters(P.enMain(en))
    if (i % TYPO_STEP === 0) for (const typo of wordTypos(en).slice(0, 2)) rows.lev.push([typo, target, P.lev(typo, target)])
    if (i % PERTURB_STEP) return
    perturbations(ref, P.enMain(en)).forEach((raw, k) => {
      rows.compare.push([raw, exEn, P.compareSentence(raw, exEn).d])
      rows.contains.push([raw, en, P.containsTarget(raw, en)])
      // «Не хватает: …» прототип показывает, когда пропущено слово-два.
      if (k === 2 || k === 6) rows.missing.push([raw, ref, P.missingWords(raw, ref)])
    })
  })
  for (let n = 1; n <= 40; n++) {
    rows.parts.push([n, P.parts(Array.from({ length: n }, (_, k) => k)).map((p) => p.length)])
  }
  // Ручные случаи: диакритика, типографский апостроф, синонимы, неправильные формы.
  for (const s of ['Café — it’s great!', "I've got two kids", 'My mom loves movies.', 'Mother can`t come']) {
    rows.toks.push([s, P.toks(s)])
  }
  for (const [raw, en] of [['We went home', 'go'], ['She studies hard', 'study'], ['The children play', 'child'], ['I bought bread', 'buy'], ['He got up late', 'get up'], ['The constructor runs first', 'constructor']]) {
    rows.contains.push([raw, en, P.containsTarget(raw, en)])
  }
  return rows
}

function main() {
  const src = process.argv[2] || DEFAULT_SRC
  const P = readPrototype(fs.readFileSync(src, 'utf8'))
  const rows = build(P)
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ source: path.relative(ROOT, src).replace(/\\/g, '/'), ...rows }) + '\n')
  const size = fs.statSync(OUT).size
  console.log(`oracle.json: ${Object.entries(rows).map(([k, v]) => `${k} ${v.length}`).join(', ')}; ${(size / 1024).toFixed(0)} КБ`)
}

module.exports = { readPrototype, build }

if (require.main === module) main()
