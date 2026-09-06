// Извлекает данные раздела «Чтение» из data/jtsreading.html — закоммиченного
// прототипа (source of truth). Данные там — JavaScript (80 текстов со ссылками
// на общие объекты INS/EXPL плюс словарь DICT), поэтому не парсим руками, а
// даём V8 исполнить вырезанный кусок в песочнице node:vm. Срез — по текстовым
// маркерам, а не по номерам строк: номера умирают при первом ре-экспорте.
//
// Запуск: node scripts/extract-reading.js [--src <путь к html>]
//
// Пишет:
//   public/practice/reading/<level>.json  — { level, texts[16] }, грузится лениво
//   public/practice/reading/dict.json     — офлайн-словарь тапа по слову
//   public/practice/reading/meta.json     — жанры и счётчики для каталога
//   scripts/reading-i18n-source.json      — en/ru/kz строки прототипа:
//       одноразовый источник для ручного порта ключей в src/i18n.jsx,
//       в рантайм НЕ подключается
//   src/practice/reading/__fixtures__/oracle-<level>.json — прогон ПРОТОТИПНЫХ
//       exTotal/wordCount/readMin по всем упражнениям уровня: оракул, с которым
//       сверяется порт движка в engine.test.js. Дрейф порта = красный тест.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const ROOT = path.join(__dirname, '..')
const DEFAULT_SRC = path.join(ROOT, 'data', 'jtsreading.html')
const OUT_DIR = path.join(ROOT, 'public', 'practice', 'reading')
const FIXTURES_DIR = path.join(ROOT, 'src', 'practice', 'reading', '__fixtures__')
const I18N_SOURCE = path.join(__dirname, 'reading-i18n-source.json')

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const TEXTS_PER_LEVEL = 16
// Типы упражнений, которые умеет движок. Новый тип в прототипе обязан здесь
// упасть, а не молча доехать до рантайма пустым экраном.
const EX_TYPES = [
  'before', 'tf', 'mc', 'match', 'gap', 'order', 'wwmatch', 'finish',
  'tfng', 'headings', 'vocab', 'summary', 'reflection',
]

function fail(msg) {
  throw new Error('[extract-reading] ' + msg)
}

// ── Срезы прототипа ──────────────────────────────────────────────────────
// Прототип держит данные во ВТОРОМ <script>: там подряд лежат DICT, INS, EXPL
// и DATA, и ни строчки DOM. Поэтому срез — весь второй скрипт целиком, а не
// хирургия по кускам: меньше швов, которые может сдвинуть ре-экспорт.
function sliceData(html) {
  const first = html.indexOf('<script>')
  if (first < 0) fail('не найден <script> в прототипе')
  const firstEnd = html.indexOf('</script>', first)
  if (firstEnd < 0) fail('первый <script> не закрыт')
  const second = html.indexOf('<script>', firstEnd)
  if (second < 0) fail('не найден второй <script> — там живут данные')
  const secondEnd = html.indexOf('</script>', second)
  if (secondEnd < 0) fail('второй <script> не закрыт')

  const body = html.slice(second + '<script>'.length, secondEnd)
  for (const mark of ['const DICT', 'const INS', 'const EXPL', 'const DATA']) {
    if (!body.includes(mark)) fail(`во втором <script> нет ${mark} — структура прототипа изменилась`)
  }
  // Слой данных обязан быть чистым: без DOM и браузерных API. Ловим только
  // код-образные формы — голое слово document легально в учебных текстах
  // (B2/C1 пишут про документы), а `document.` поймало бы точку в конце
  // предложения.
  const domish = [
    /\bdocument\.(getElementById|createElement|querySelector|addEventListener|body)\b/,
    /\blocalStorage\./,
    /\bspeechSynthesis\b/,
    /\bwindow\.(location|addEventListener|innerWidth)\b/,
  ]
  for (const re of domish) {
    if (re.test(body)) fail(`в слое данных нашёлся браузерный код (${re}) — срез небезопасен`)
  }
  return body
}

// I18N живёт в первом скрипте между `const I18N = {` и баннером состояния.
// Берём его отдельным срезом: это единственное, что нам нужно из скрипта с DOM.
function sliceI18n(html) {
  const start = html.indexOf('const I18N = {')
  const end = html.indexOf('/* ---------- state ---------- */')
  if (start < 0 || end < 0 || end < start) fail('не нашёл границы блока I18N')
  return html.slice(start, end)
}

// Выкусывает исходник именованной функции по балансу скобок. Нужен для оракула:
// метрики должен считать САМ прототип, иначе фикстура проверяет наш же порт
// против нашего же порта и ничего не ловит.
function sliceFunction(src, name) {
  const head = `function ${name}(`
  const at = src.indexOf(head)
  if (at < 0) fail(`не найдена функция ${name}() — прототип изменил структуру`)
  const open = src.indexOf('{', src.indexOf(')', at))
  if (open < 0) fail(`не найдено тело функции ${name}()`)
  let depth = 0
  let i = open
  while (i < src.length) {
    const c = src[i]
    // Голый счётчик скобок тут не годится: exTotal ищет пропуски регэкспом
    // /\{[^}]+\}/g, и его фигурные скобки закрыли бы функцию на середине.
    // Поэтому строки, комментарии и регэкспы проматываем целиком.
    if (c === '"' || c === "'" || c === '`') { i = skipString(src, i); continue }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 2; continue }
    if (c === '/' && isRegexStart(src, i)) { i = skipRegex(src, i); continue }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return src.slice(at, i + 1)
    }
    i++
  }
  return fail(`не закрылось тело функции ${name}()`)
}

function skipString(src, at) {
  const quote = src[at]
  for (let i = at + 1; i < src.length; i++) {
    if (src[i] === '\\') { i++; continue }
    if (src[i] === quote) return i + 1
  }
  return fail('не закрылась строка в исходнике прототипа')
}

// Слеш начинает регэксп, а не деление, если перед ним оператор или открывающая
// скобка. В вырезаемых функциях регэкспы стоят только после `(` и `,`
// (.match(/…/), .replace(/…/, …)), так что списка хватает с запасом.
function isRegexStart(src, at) {
  for (let i = at - 1; i >= 0; i--) {
    const c = src[i]
    if (/\s/.test(c)) continue
    return '(,=:[!&|?{};+-*%~^'.includes(c)
  }
  return true
}

function skipRegex(src, at) {
  let inClass = false
  for (let i = at + 1; i < src.length; i++) {
    const c = src[i]
    if (c === '\\') { i++; continue }
    if (c === '[') inClass = true
    else if (c === ']') inClass = false
    else if (c === '/' && !inClass) {
      while (/[a-z]/.test(src[i + 1] || '')) i++ // флаги
      return i + 1
    }
  }
  return fail('не закрылся регэксп в исходнике прототипа')
}

// ── Валидация ────────────────────────────────────────────────────────────
function checkText(x, level) {
  const where = `${level}/${x.id || '???'}`
  if (!x.id || !x.title || x.level !== level) fail(`${where}: битая шапка текста`)
  if (!Array.isArray(x.text) || x.text.length < 2) fail(`${where}: текст пустой или в один абзац`)
  if (!Array.isArray(x.words) || !x.words.length) fail(`${where}: нет ключевых слов`)
  if (!Array.isArray(x.exercises) || !x.exercises.length) fail(`${where}: нет упражнений`)
  for (const w of x.words) {
    if (!w.en || !w.ru || !w.kz) fail(`${where}: у слова «${w.en || '?'}» нет ru/kz`)
  }
  for (const ex of x.exercises) {
    if (!EX_TYPES.includes(ex.type)) fail(`${where}: неизвестный тип упражнения «${ex.type}»`)
    if (ex.type === 'gap') {
      const slots = (ex.text.match(/\{[^}]+\}/g) || []).length
      if (!slots) fail(`${where}: gap без пропусков`)
    } else if (ex.type === 'reflection') {
      if (!Array.isArray(ex.keys) || !ex.keys.length) fail(`${where}: reflection без ключевых идей`)
      if (!ex.model) fail(`${where}: reflection без образцового ответа`)
    } else if (['match', 'wwmatch', 'headings'].includes(ex.type)) {
      if (!Array.isArray(ex.pairs) || ex.pairs.length < 2) fail(`${where}: ${ex.type} без пар`)
    } else if (['order', 'summary'].includes(ex.type)) {
      if (!Array.isArray(ex.items) || ex.items.length < 2) fail(`${where}: ${ex.type} без пунктов`)
    } else {
      if (!Array.isArray(ex.items) || !ex.items.length) fail(`${where}: ${ex.type} без вопросов`)
      for (const it of ex.items) {
        if (ex.type === 'tf') {
          if (typeof it.a !== 'boolean') fail(`${where}: tf с ответом не-boolean`)
        } else if (ex.type === 'tfng') {
          if (!['T', 'F', 'NG'].includes(it.a)) fail(`${where}: tfng с ответом «${it.a}»`)
        } else {
          if (!Array.isArray(it.o) || typeof it.a !== 'number' || !it.o[it.a]) {
            fail(`${where}: ${ex.type} с битым ответом`)
          }
        }
      }
    }
  }
}

// ── Основной проход ──────────────────────────────────────────────────────
function main() {
  const argSrc = process.argv.indexOf('--src')
  const src = argSrc > -1 ? process.argv[argSrc + 1] : DEFAULT_SRC
  const html = fs.readFileSync(src, 'utf8')

  const { DICT, DATA, I18N, proto } = readPrototype(html)
  for (const lang of ['en', 'ru', 'kz']) {
    if (!I18N[lang] || !I18N[lang].library) fail(`в I18N нет языка ${lang}`)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.mkdirSync(FIXTURES_DIR, { recursive: true })

  const counts = {}
  const genres = new Set()
  for (const level of LEVELS) {
    const texts = DATA[level]
    if (!Array.isArray(texts) || texts.length !== TEXTS_PER_LEVEL) {
      fail(`уровень ${level}: ожидалось ${TEXTS_PER_LEVEL} текстов, найдено ${texts ? texts.length : 0}`)
    }
    const ids = new Set()
    for (const x of texts) {
      checkText(x, level)
      if (ids.has(x.id)) fail(`уровень ${level}: дубль id «${x.id}»`)
      ids.add(x.id)
      genres.add(x.genre)
    }
    counts[level.toLowerCase()] = texts.length

    const key = level.toLowerCase()
    write(path.join(OUT_DIR, `${key}.json`), { level, texts })

    // Фикстура-оракул: метрики текста и «сколько всего очков» в каждом
    // упражнении — то, на чём стоит весь подсчёт прогресса.
    write(path.join(FIXTURES_DIR, `oracle-${key}.json`), {
      level,
      texts: texts.map((x) => ({
        id: x.id,
        words: proto.wordCount(x.text),
        minutes: proto.readMin(x.text),
        sentences: x.text.map((p) => proto.sentences(p)),
        exTotals: x.exercises.map((ex) => ({ type: ex.type, total: proto.exTotal(ex) })),
      })),
    })
  }

  // Словарь: ключи прототип держит уже нормализованными, но проверим — тап по
  // слову ищет по norm(), и ключ с заглавной буквой не нашёлся бы никогда.
  const dict = {}
  for (const [word, pair] of Object.entries(DICT)) {
    if (word !== proto.norm(word)) fail(`словарь: ключ «${word}» не в нормальной форме`)
    if (!Array.isArray(pair) || pair.length !== 2) fail(`словарь: у «${word}» не пара [ru, kz]`)
    dict[word] = pair
  }
  write(path.join(OUT_DIR, 'dict.json'), dict)

  write(path.join(OUT_DIR, 'meta.json'), {
    levels: LEVELS.map((l) => l.toLowerCase()),
    genres: [...genres].sort(),
    counts,
  })

  write(I18N_SOURCE, I18N)

  const totalTexts = Object.values(counts).reduce((a, b) => a + b, 0)
  console.log(`[extract-reading] ${totalTexts} текстов, ${Object.keys(dict).length} слов в словаре`)
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data) + '\n')
}

// Разбор прототипа отдельно от записи файлов: тест (extract-reading.test.js)
// гоняет ровно его, а не свою копию правил, — иначе проверял бы не экстрактор.
// Оракул считают ПРОТОТИПНЫЕ функции, выкушенные из первого скрипта: наш порт
// сверяется с ними, а не сам с собой.
function readPrototype(html) {
  const dataCtx = vm.createContext({})
  vm.runInContext(sliceData(html), dataCtx, { timeout: 20000 })
  const { DICT, INS, EXPL, DATA } = vm.runInContext('({DICT, INS, EXPL, DATA})', dataCtx)

  const i18nCtx = vm.createContext({})
  vm.runInContext(sliceI18n(html), i18nCtx, { timeout: 5000 })
  const I18N = vm.runInContext('I18N', i18nCtx)

  const engineSrc = html.slice(html.indexOf('<script>'), html.indexOf('</script>'))
  const oracleCtx = vm.createContext({})
  vm.runInContext(
    ['norm', 'wordCount', 'readMin', 'sentences', 'exTotal'].map((n) => sliceFunction(engineSrc, n)).join('\n'),
    oracleCtx,
  )
  const proto = vm.runInContext('({norm, wordCount, readMin, sentences, exTotal})', oracleCtx)

  return { DICT, INS, EXPL, DATA, I18N, proto }
}

module.exports = {
  DEFAULT_SRC,
  EX_TYPES,
  LEVELS,
  TEXTS_PER_LEVEL,
  checkText,
  readPrototype,
  sliceData,
  sliceFunction,
  sliceI18n,
}

if (require.main === module) main()
