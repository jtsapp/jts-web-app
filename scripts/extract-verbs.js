// Извлекает данные раздела «Неправильные глаголы» из data/jtsverbs.html —
// закоммиченного прототипа «verb-rap» (source of truth): 90 глаголов в восьми
// группах, 60 предложений, 60 исправлений и 210 записей форм.
//
// Запуск: node scripts/extract-verbs.js [--src <путь к html>]
//
// Пишет:
//   public/practice/verbs/verbs.json      — глаголы, группы, предложения,
//       исправления, созвучия распознавания и офлайн-словарь тапа
//   public/practice/verbs/audio/<ключ>.wav — записи форм как есть (base64 → файл)
//   scripts/verbs-i18n-source.json        — en/ru/kk строки прототипа:
//       источник ручного порта ключей в src/i18n.jsx, в рантайм НЕ подключается
//   src/practice/verbs/__fixtures__/oracle.json — прогон ПРОТОТИПНЫХ
//       pat/rhythmForms/checkForm/scoreTargets/rebuildQueue/visibleVerbs:
//       оракул, с которым сверяется порт движка. Дрейф порта = красный тест.
//
// ── Почему константы режутся по одной ────────────────────────────────────
// Весь прототип — один IIFE, где данные и DOM-код идут вперемешку, а
// бутстрап в конце трогает три десятка узлов. Исполнять его целиком под
// заглушкой (как extract-words.js) значило бы писать заглушку на весь DOM.
// Нужные же значения здесь — обычные `var X = <литерал>`, и функции оракула
// чистые, поэтому хватает sliceConst/sliceFunction по именам.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { sliceConst, sliceFunction } = require('./lib/js-slice.js')

const ROOT = path.join(__dirname, '..')
const DEFAULT_SRC = path.join(ROOT, 'data', 'jtsverbs.html')
const OUT_DIR = path.join(ROOT, 'public', 'practice', 'verbs')
const AUDIO_DIR = path.join(OUT_DIR, 'audio')
const FIXTURES_DIR = path.join(ROOT, 'src', 'practice', 'verbs', '__fixtures__')
const I18N_SOURCE = path.join(__dirname, 'verbs-i18n-source.json')

const LEVELS = ['A1', 'A2', 'B1']
const MODES = ['repeat', 'gap', 'write', 'sentence', 'fix']
// Ожидаемый состав. Прототип может дополниться, но молча потерять половину
// материала он не должен — поэтому нижние границы, а не «сколько получилось».
const MIN_VERBS = 80
const MIN_ITEMS = 50
// Отмеченные глаголы для прогона оракула по набору «saved»: по одному из
// каждой характерной группы плюс оба глагола с вариантами через «/».
const ORACLE_SAVED = ['be', 'get', 'go', 'read', 'put', 'think', 'write', 'sing']

function fail(msg) {
  throw new Error('[extract-verbs] ' + msg)
}

// ── Срезы прототипа ──────────────────────────────────────────────────────
// Второй <script> — движок. Первый крошечный (ловец ошибок) и нам не нужен.
function sliceEngine(html) {
  const first = html.indexOf('<script>')
  if (first < 0) fail('не найден <script> в прототипе')
  const second = html.indexOf('<script>', html.indexOf('</script>', first))
  if (second < 0) fail('не найден второй <script> — там живёт движок')
  const end = html.indexOf('</script>', second)
  if (end < 0) fail('второй <script> не закрыт')
  const body = html.slice(second + '<script>'.length, end)
  for (const mark of ['var I18N', 'var VERBS', 'var GROUPS', 'var RHYTHM_AUDIO', 'var SENTENCES', 'var FIXES', 'var ALIASES', 'var extraWords']) {
    if (!body.includes(mark)) fail(`в движке нет ${mark} — структура прототипа изменилась`)
  }
  return body
}

// Значение одной константы: срез объявления исполняется в пустой песочнице.
function constValue(engine, name) {
  const ctx = vm.createContext({})
  vm.runInContext(sliceConst(engine, name), ctx, { timeout: 20000 })
  return vm.runInContext(name, ctx)
}

// ── Записи ───────────────────────────────────────────────────────────────
// Прототип разбирает WAV сам (rhythmVoice.buffer) и ждёт ровно PCM 16 бит
// моно: иначе сэмплы прочитаются мусором. Проверяем то же, что он читает.
function checkWav(key, buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') {
    fail(`запись «${key}»: не RIFF/WAVE`)
  }
  let off = 12
  let fmt = null
  let data = 0
  while (off + 8 <= buf.length) {
    const id = buf.toString('latin1', off, off + 4)
    const len = buf.readUInt32LE(off + 4)
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(off + 8),
        channels: buf.readUInt16LE(off + 10),
        rate: buf.readUInt32LE(off + 12),
        bits: buf.readUInt16LE(off + 22),
      }
    }
    if (id === 'data') {
      data = len
      break
    }
    off += 8 + len + (len % 2)
  }
  if (!fmt) fail(`запись «${key}»: нет fmt-чанка`)
  if (fmt.format !== 1 || fmt.channels !== 1 || fmt.bits !== 16) {
    fail(`запись «${key}»: ожидался PCM 16 бит моно, а там формат ${fmt.format}, ${fmt.channels} кан., ${fmt.bits} бит`)
  }
  if (!data) fail(`запись «${key}»: пустой data-чанк`)
  return { rate: fmt.rate, seconds: data / 2 / fmt.rate }
}

// ── Валидация ────────────────────────────────────────────────────────────
function checkData({ I18N, VERBS, GROUPS, SENTENCES, FIXES, AUDIO, proto }) {
  for (const lang of ['en', 'ru', 'kk']) {
    if (!I18N[lang] || !I18N[lang].title) fail(`в I18N нет языка ${lang}`)
  }
  if (!Array.isArray(VERBS) || VERBS.length < MIN_VERBS) fail(`глаголов ${VERBS && VERBS.length}, ожидалось не меньше ${MIN_VERBS}`)
  for (const g of GROUPS) if (!I18N.en['group_' + g]) fail(`группа ${g} без названия в I18N`)
  const seen = new Set()
  for (const v of VERBS) {
    const where = `глагол «${v.v1 || '?'}»`
    if (!v.v1 || !v.v2 || !v.v3) fail(`${where}: нет одной из трёх форм`)
    if (seen.has(v.v1)) fail(`${where}: дубль`)
    seen.add(v.v1)
    if (!v.ru || !v.kk) fail(`${where}: нет перевода ru/kk`)
    if (!LEVELS.includes(v.lvl)) fail(`${where}: неизвестный уровень ${v.lvl}`)
    if (!GROUPS.includes(v.group)) fail(`${where}: неизвестная группа ${v.group}`)
    if (v.note && !I18N.en[v.note]) fail(`${where}: примечание ${v.note} без строки в I18N`)
    // Каждой доле ритма нужна своя запись — иначе попытка упадёт на
    // «встроенный голос не загрузился» прямо посреди такта.
    for (let i = 0; i < 3; i++) {
      const key = proto.rhythmVoice.key(v, i)
      if (!AUDIO[key]) fail(`${where}: нет записи «${key}» для V${i + 1}`)
    }
  }
  const byVerb = new Set(VERBS.map((v) => v.v1))
  const checkItems = (list, kind) => {
    if (!Array.isArray(list) || list.length < MIN_ITEMS) fail(`${kind}: ${list && list.length} заданий, ожидалось не меньше ${MIN_ITEMS}`)
    const ids = new Set()
    for (const it of list) {
      const where = `${kind} ${it.id || '?'}`
      if (!it.id || ids.has(it.id)) fail(`${where}: нет id или дубль`)
      ids.add(it.id)
      if (!byVerb.has(it.verb)) fail(`${where}: глагол «${it.verb}» не из таблицы`)
      if (!LEVELS.includes(it.lvl)) fail(`${where}: уровень ${it.lvl}`)
      if (![0, 1, 2].includes(it.form)) fail(`${where}: форма ${it.form}`)
      if (!I18N.en[it.rule]) fail(`${where}: правило ${it.rule} без строки в I18N`)
      if (kind === 'sentence' && (it.text.match(/____/g) || []).length !== 1) fail(`${where}: в предложении не один пропуск`)
      if (kind === 'fix') {
        if ((it.text.match(/\{[^}]+\}/g) || []).length !== 1) fail(`${where}: в предложении не одна ошибка в {скобках}`)
        if (!it.answer) fail(`${where}: нет верного ответа`)
      }
    }
  }
  checkItems(SENTENCES, 'sentence')
  checkItems(FIXES, 'fix')
  const meta = {}
  for (const [key, b64] of Object.entries(AUDIO)) {
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(key)) fail(`ключ записи «${key}» не годится в имя файла`)
    meta[key] = checkWav(key, Buffer.from(b64, 'base64'))
  }
  return meta
}

// Офлайн-словарь тапа — ровно как LOCAL_WORDS прототипа: сначала каждая
// форма каждого глагола (варианты через «/» отдельно, первый глагол
// выигрывает), потом слова предложений, не перебивая глагольные формы.
function buildDict(VERBS, extraWords) {
  const dict = {}
  for (const v of VERBS) {
    for (const chain of [v.v1, v.v2, v.v3]) {
      for (const word of chain.split(/\s*\/\s*/)) {
        if (!dict[word]) dict[word] = { lemma: v.v1, ru: v.ru, kk: v.kk }
      }
    }
  }
  for (const [en, ru, kk] of extraWords) {
    const w = en.toLowerCase()
    if (!dict[w]) dict[w] = { lemma: w, ru, kk }
  }
  return dict
}

// ── Оракул ───────────────────────────────────────────────────────────────
// Функции прототипа читают глобальные S и P. В песочнице они и есть
// глобальные: перед каждым прогоном выставляем нужное состояние.
const ORACLE_FNS = [
  'pat', 'forms', 'rhythmForms', 'tokens', 'scoreTargets', 'normalized',
  'answerOptions', 'checkForm', 'spokenMode', 'selectedVerbs', 'rebuildQueue',
  'list', 'item', 'currentVerb', 'targetForms', 'expected', 'progressKey',
  'visibleVerbs', 'writtenFields',
]

function makeOracleContext(engine, data) {
  const ctx = vm.createContext({})
  const src = [
    `var VERBS = ${JSON.stringify(data.VERBS)};`,
    `var GROUPS = ${JSON.stringify(data.GROUPS)};`,
    `var SENTENCES = ${JSON.stringify(data.SENTENCES)};`,
    `var FIXES = ${JSON.stringify(data.FIXES)};`,
    sliceConst(engine, 'ALIASES') + ';',
    'var BY = {}; VERBS.forEach(function (v) { BY[v.v1] = v; });',
    // t() нужен одной writtenFields — метке поля; оракулу хватает ключа.
    'function t(k) { return k; }',
    // Оракул детерминирован: перемешивание проверяется отдельно, по-своему.
    'function shuffled(a) { return a.slice(); }',
    "var S = { set: 'all', saved: {}, practiceLevel: 'A1', formCount: 3, limit: 0, level: 'all', pattern: 'all', group: 'all', onlySaved: false, query: '' };",
    "var P = { mode: 'repeat', idx: 0, gap: 1, queue: null, available: [], result: null };",
    ...ORACLE_FNS.map((n) => sliceFunction(engine, n)),
    // Ключ записи — метод объекта rhythmVoice; остальные его методы трогают
    // Web Audio, но оракул их не зовёт.
    sliceConst(engine, 'rhythmVoice') + ';',
  ].join('\n')
  vm.runInContext(src, ctx, { timeout: 10000 })
  return ctx
}

function run(ctx, code) {
  return vm.runInContext(code, ctx)
}

function setState(ctx, s, p) {
  vm.runInContext(`Object.assign(S, ${JSON.stringify(s)}); Object.assign(P, ${JSON.stringify(p)});`, ctx)
}

// Ответы, на которых стоит проверка письма: все допустимые варианты, их
// склейка, регистр, пробелы и финальная точка — и заведомо неверные формы.
function answerCandidates(v, index) {
  const chain = [v.v1, v.v2, v.v3][index]
  const variants = chain.split(/\s*\/\s*/)
  const out = new Set([chain, variants.join('/'), variants.join(' / '), ' ' + variants[0].toUpperCase() + ' '])
  for (const x of variants) {
    out.add(x)
    out.add(x + '.')
    out.add(x + '!')
    out.add(x + '?')
  }
  for (const other of [v.v1, v.v2, v.v3]) out.add(other)
  out.add(v.v1 + 'ed')
  out.add('')
  if (variants.length > 1) out.add(variants.slice().reverse().join('/'))
  return [...out]
}

// Расшифровки для счёта распознанного: точное попадание, созвучия, чужой
// порядок, недоговорённость, лишние слова и пунктуация распознавателя.
function transcriptCandidates(expected, aliases) {
  const out = new Set()
  out.add(expected.join(' '))
  out.add(expected.join(', ') + '.')
  out.add(expected.map((w) => w[0].toUpperCase() + w.slice(1)).join(' '))
  out.add(expected.slice().reverse().join(' '))
  out.add(expected[0])
  out.add('um ' + expected.join(' '))
  out.add('')
  out.add(expected.map((w) => (aliases[w] && aliases[w][0]) || w).join(' '))
  if (expected.includes('was')) out.add(expected.map((w) => (w === 'was' ? 'were' : w)).join(' '))
  if (expected.includes('got')) out.add(expected.map((w) => (w === 'got' ? 'gotten' : w)).join(' '))
  return [...out]
}

function buildOracle(engine, data) {
  const ctx = makeOracleContext(engine, data)
  const aliases = run(ctx, 'ALIASES')

  const verbs = data.VERBS.map((v) =>
    run(ctx, `(function (v) { return { v1: v.v1, pattern: pat(v), rhythm: rhythmForms(v), clips: [0, 1, 2].map(function (i) { return rhythmVoice.key(v, i) }) } })(BY[${JSON.stringify(v.v1)}])`),
  )

  const checkForm = []
  for (const v of data.VERBS) {
    for (const index of [0, 1, 2]) {
      for (const value of answerCandidates(v, index)) {
        const ok = run(ctx, `checkForm(${JSON.stringify(value)}, BY[${JSON.stringify(v.v1)}], ${index})`)
        checkForm.push({ v1: v.v1, index, value, ok })
      }
    }
  }

  // scoreTargets смотрит на P.mode и P.gap (got/gotten засчитывается только
  // за V3), поэтому прогоняем и ритм на 2–3 формы, и пропуск на V2/V3.
  const score = []
  const push = (mode, gap, formCount, v) => {
    setState(ctx, { formCount }, { mode, gap })
    const rf = run(ctx, `rhythmForms(BY[${JSON.stringify(v.v1)}])`).slice(0, formCount)
    const expected = mode === 'gap' ? [rf[gap]] : rf
    for (const text of transcriptCandidates(expected, aliases)) {
      const result = run(ctx, `scoreTargets(${JSON.stringify(expected)}, ${JSON.stringify(text)})`)
      score.push({ mode, gap, expected, text, result })
    }
  }
  for (const v of data.VERBS) {
    push('repeat', 1, 3, v)
    push('repeat', 1, 2, v)
    push('gap', 1, 3, v)
    push('gap', 2, 3, v)
  }

  const saved = Object.fromEntries(ORACLE_SAVED.map((k) => [k, true]))
  const queues = []
  for (const mode of MODES) {
    for (const formCount of [2, 3]) {
      for (const level of ['all', ...LEVELS]) {
        for (const set of ['all', 'saved', ...data.GROUPS]) {
          setState(ctx, { set, saved, practiceLevel: level, formCount, limit: 0 }, { mode })
          run(ctx, 'rebuildQueue(false)')
          queues.push({
            mode,
            formCount,
            level,
            set,
            key: run(ctx, 'progressKey()'),
            available: run(ctx, 'P.available.length'),
            ids: run(ctx, 'P.queue.map(function (it) { return it.id })'),
          })
        }
      }
    }
  }

  const visible = []
  for (const level of ['all', ...LEVELS]) {
    for (const pattern of ['all', 'AAA', 'ABB', 'ABA', 'ABC', 'AAB']) {
      for (const group of ['all', ...data.GROUPS]) {
        setState(ctx, { level, pattern, group, onlySaved: false, query: '', saved }, {})
        const ids = run(ctx, 'visibleVerbs().map(function (v) { return v.v1 })')
        visible.push({ level, pattern, group, onlySaved: false, query: '', ids })
      }
    }
  }
  for (const query of ['go', 'ought', 'бару', 'иметь', 'жазу', 'was / were', 'зн', 'xyz']) {
    for (const onlySaved of [false, true]) {
      setState(ctx, { level: 'all', pattern: 'all', group: 'all', onlySaved, query, saved }, {})
      const ids = run(ctx, 'visibleVerbs().map(function (v) { return v.v1 })')
      visible.push({ level: 'all', pattern: 'all', group: 'all', onlySaved, query, ids })
    }
  }

  const fields = []
  for (const formCount of [2, 3]) {
    for (const v of data.VERBS) {
      setState(ctx, { formCount }, { mode: 'write', queue: [{ id: v.v1, verb: v.v1 }], idx: 0 })
      fields.push({ mode: 'write', formCount, id: v.v1, fields: run(ctx, 'writtenFields()') })
    }
  }
  for (const [mode, items] of [['sentence', data.SENTENCES], ['fix', data.FIXES]]) {
    for (const it of items) {
      setState(ctx, { formCount: 3 }, { mode, queue: [it], idx: 0 })
      fields.push({ mode, formCount: 3, id: it.id, fields: run(ctx, 'writtenFields()') })
    }
  }

  return { saved: ORACLE_SAVED, verbs, checkForm, score, queues, visible, fields }
}

// ── Основной проход ──────────────────────────────────────────────────────
// Разбор отдельно от записи файлов: тест (extract-verbs.test.js) гоняет ровно
// его, а не свою копию правил, — иначе проверял бы не экстрактор.
function readPrototype(html) {
  const engine = sliceEngine(html)
  const data = {
    I18N: constValue(engine, 'I18N'),
    VERBS: constValue(engine, 'VERBS'),
    GROUPS: constValue(engine, 'GROUPS'),
    SENTENCES: constValue(engine, 'SENTENCES'),
    FIXES: constValue(engine, 'FIXES'),
    ALIASES: constValue(engine, 'ALIASES'),
    extraWords: constValue(engine, 'extraWords'),
    AUDIO: constValue(engine, 'RHYTHM_AUDIO'),
  }
  const ctx = makeOracleContext(engine, data)
  data.proto = { rhythmVoice: vm.runInContext('rhythmVoice', ctx) }
  data.engine = engine
  return data
}

function main() {
  const argSrc = process.argv.indexOf('--src')
  const src = argSrc > -1 ? process.argv[argSrc + 1] : DEFAULT_SRC
  const html = fs.readFileSync(src, 'utf8')

  const data = readPrototype(html)
  const clipMeta = checkData(data)
  const dict = buildDict(data.VERBS, data.extraWords)

  fs.mkdirSync(AUDIO_DIR, { recursive: true })
  fs.mkdirSync(FIXTURES_DIR, { recursive: true })

  write(path.join(OUT_DIR, 'verbs.json'), {
    verbs: data.VERBS,
    groups: data.GROUPS,
    sentences: data.SENTENCES,
    fixes: data.FIXES,
    aliases: data.ALIASES,
    dict,
  })

  // Лишние файлы убираем: запись, пропавшая из прототипа, не должна тихо
  // доживать в public/ и маскировать дыру в данных.
  const keys = new Set(Object.keys(data.AUDIO))
  for (const f of fs.readdirSync(AUDIO_DIR)) {
    if (f.endsWith('.wav') && !keys.has(f.slice(0, -4))) fs.unlinkSync(path.join(AUDIO_DIR, f))
  }
  let bytes = 0
  for (const [key, b64] of Object.entries(data.AUDIO)) {
    const buf = Buffer.from(b64, 'base64')
    bytes += buf.length
    fs.writeFileSync(path.join(AUDIO_DIR, `${key}.wav`), buf)
  }

  write(path.join(FIXTURES_DIR, 'oracle.json'), buildOracle(data.engine, data))
  write(I18N_SOURCE, data.I18N)

  const longest = Math.max(...Object.values(clipMeta).map((m) => m.seconds))
  console.log(
    `[extract-verbs] ${data.VERBS.length} глаголов, ${data.SENTENCES.length} предложений, ` +
      `${data.FIXES.length} исправлений, ${keys.size} записей (${(bytes / 1024 / 1024).toFixed(2)} МБ, ` +
      `длиннейшая ${longest.toFixed(2)} с), ${Object.keys(dict).length} слов в словаре`,
  )
}

function write(file, value) {
  fs.writeFileSync(file, JSON.stringify(value) + '\n')
}

module.exports = {
  DEFAULT_SRC,
  LEVELS,
  MODES,
  buildDict,
  buildOracle,
  checkData,
  checkWav,
  readPrototype,
  sliceEngine,
}

if (require.main === module) main()
