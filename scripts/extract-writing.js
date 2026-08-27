// Извлекает данные секции Writing из data/jtswriting.html — закоммиченного
// прототипа (source of truth). Данные в прототипе — это JavaScript (180 вызовов
// S(...) плюс банки уровней), поэтому не парсим руками, а даём V8 исполнить
// вырезанный кусок в песочнице node:vm. Срез — по текстовым маркерам, а не по
// номерам строк: номера умирают при первом же ре-экспорте прототипа.
//
// Запуск: node scripts/extract-writing.js [--src <путь к html>]
//
// Пишет:
//   public/practice/writing/<level>.json                — { level, seeds[30], bank }
//   public/practice/writing/meta.json                   — то, что нужно движку в рантайме
//   scripts/writing-i18n-source.json                    — ru/kk словари прототипа:
//       одноразовый источник для ручного порта ключей в src/i18n.jsx,
//       в рантайм НЕ подключается
//   src/practice/writing/__fixtures__/genre-<level>.json — вывод ПРОТОТИПНОГО
//       buildGenre (первый жанр уровня): оракул, с которым сверяется порт
//       движка в engine.test.js. Дрейф порта = красный тест.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const ROOT = path.join(__dirname, '..')
const DEFAULT_SRC = path.join(ROOT, 'data', 'jtswriting.html')
const OUT_DIR = path.join(ROOT, 'public', 'practice', 'writing')
const FIXTURES_DIR = path.join(ROOT, 'src', 'practice', 'writing', '__fixtures__')
const I18N_SOURCE = path.join(__dirname, 'writing-i18n-source.json')

const LEVELS = ['a1', 'a2', 'a2p', 'b1', 'b2', 'c1']
const SEEDS_PER_LEVEL = 30
const BANK_KEYS = ['conn', 'connTable', 'connItems', 'tr', 'reg', 'offIdeas', 'outlineRules', 'rubric']

function fail(msg) {
  throw new Error('[extract-writing] ' + msg)
}

// ── Срезы прототипа ──────────────────────────────────────────────────────
// Слой данных: от "use strict"; до `var NS = ...` (первая строка движка).
// Баннер «ДВИЖОК» перед NS обязан существовать — это страховка от того, что
// кто-то переставил куски прототипа и в «данные» уехал рендер-код.
function slicePrototype(html) {
  const scriptOpen = html.indexOf('<script>')
  if (scriptOpen < 0) fail('не найден <script> в прототипе')
  const strictMark = '"use strict";'
  const strictIdx = html.indexOf(strictMark, scriptOpen)
  if (strictIdx < 0) fail('не найдена "use strict"; — прототип изменил структуру')

  const engineBanner = html.indexOf('ДВИЖОК. Ниже — только логика')
  const nsIdx = html.indexOf('var NS = "jts.writing.";')
  if (nsIdx < 0) fail('не найден маркер `var NS = "jts.writing.";` — конец данных неизвестен')
  if (engineBanner < 0 || engineBanner > nsIdx) {
    fail('баннер «ДВИЖОК» не найден перед var NS — структура прототипа изменилась, срез небезопасен')
  }
  // Посреди данных живёт DOM-механизм переключения языка (var Lang …
  // initLang) — вырезаем его, чтобы срез оставался чистым: наш React-порт
  // переводит интерфейс через i18n приложения, а не через MutationObserver.
  const langStart = html.indexOf('var Lang = {')
  const langEnd = html.indexOf('/* ── Инструкции к заданиям')
  if (langStart < 0 || langEnd < 0 || !(strictIdx < langStart && langStart < langEnd && langEnd < nsIdx)) {
    fail('не нашёл границы языкового блока (var Lang … «Инструкции к заданиям»)')
  }
  const data = html.slice(strictIdx + strictMark.length, langStart) + html.slice(langEnd, nsIdx)

  // Слой данных обязан быть чистым: без DOM и браузерных API. Ловим только
  // код-образные формы — голые слова document/window легальны в учебных
  // текстах (b2/c1 пишут про документы), а `document.` ловит и точку в конце
  // предложения, поэтому паттерны — только вызовы/обращения.
  const domish = [
    /\bdocument\.(getElementById|createElement|querySelector|addEventListener|body)\b/,
    /\blocalStorage\./,
    /\baddEventListener\(/,
    /\bwindow\.(location|innerWidth|getSelection|addEventListener)\b/,
  ]
  for (const rx of domish) {
    const m = data.match(rx)
    if (m) fail('в срезе данных найден DOM-код (' + m[0] + ') — рендер уехал выше маркера, срез небезопасен')
  }

  // Движковый мини-срез: hashStr/rng/shuffle — они нужны прототипному
  // buildGenre (через pickN) для генерации эталонных фикстур.
  const hashIdx = html.indexOf('function hashStr')
  const toastIdx = html.indexOf('/* ── Тост')
  if (hashIdx < 0 || toastIdx < 0 || hashIdx > toastIdx) fail('не найден блок hashStr/rng/shuffle')
  const engine = html.slice(hashIdx, toastIdx)

  // TYPE_LABEL (английский) живёт в движковой части — вырезаем его объект
  // отдельно для i18n-источника. `= {` в маркере отличает его от TYPE_LABEL_RU.
  const tlIdx = html.indexOf('var TYPE_LABEL = {')
  if (tlIdx < 0) fail('не найден var TYPE_LABEL')
  const tlEnd = html.indexOf('};', tlIdx)
  const typeLabel = html.slice(tlIdx, tlEnd + 2)

  return { data, engine, typeLabel }
}

// ── Исполнение в песочнице ───────────────────────────────────────────────
function evalPrototype(html) {
  const { data, engine, typeLabel } = slicePrototype(html)
  const sandbox = {}
  vm.createContext(sandbox)
  vm.runInContext(data, sandbox, { timeout: 10000, filename: 'jtswriting-data.js' })
  vm.runInContext(engine, sandbox, { timeout: 10000, filename: 'jtswriting-engine.js' })
  vm.runInContext(typeLabel, sandbox, { timeout: 10000, filename: 'jtswriting-typelabel.js' })

  const wanted = [
    'RULES', 'RULES_RU', 'RULES_KK', 'UI', 'UI_EXTRA',
    'TITLES', 'TITLES_RU', 'TITLES_KK', 'TYPE_LABEL', 'TYPE_LABEL_RU', 'TYPE_LABEL_KK',
    'HOWTO', 'HOWTO_RU', 'HOWTO_KK', 'LEVEL_TITLES', 'LEVEL_TAG', 'FN_WHY',
    'SEEDS', 'BANKS', 'buildGenre',
  ]
  for (const name of wanted) {
    if (sandbox[name] === undefined) fail('в песочнице не оказалось ' + name + ' — прототип переименовал переменную')
  }
  return sandbox
}

// ── Валидации (fail, не warn: тихо испорченные данные хуже упавшего скрипта) ─
function isTriple(x) {
  return Array.isArray(x) && x.length === 3 && x.every((s) => typeof s === 'string' && s.length > 0)
}

function validate(sandbox) {
  const { SEEDS, BANKS, RULES } = sandbox
  const levels = Object.keys(SEEDS)
  if (levels.join(',') !== LEVELS.join(',')) fail('уровни не совпадают: ' + levels.join(','))

  let total = 0
  for (const level of LEVELS) {
    const seeds = SEEDS[level]
    if (seeds.length !== SEEDS_PER_LEVEL) fail(level + ': жанров ' + seeds.length + ', ждали ' + SEEDS_PER_LEVEL)
    const bank = BANKS[level]
    if (!bank) fail(level + ': нет банка')
    for (const key of BANK_KEYS) {
      if (bank[key] === undefined) fail(level + ': в банке нет ' + key)
    }
    for (const crit of ['task', 'organisation', 'vocabulary', 'grammar']) {
      if (typeof bank.rubric[crit] !== 'string') fail(level + ': rubric без ' + crit)
    }

    const ids = new Set()
    for (const seed of seeds) {
      const where = level + '/' + seed.id
      if (!seed.id || ids.has(seed.id)) fail(where + ': пустой или повторный id')
      ids.add(seed.id)
      for (const field of ['title', 'sub', 'goal', 'why', 'ex', 'task', 'reg']) {
        if (typeof seed[field] !== 'string' || !seed[field]) fail(where + ': нет поля ' + field)
      }
      if (!Array.isArray(seed.tw) || seed.tw.length !== 2 || !(seed.tw[0] < seed.tw[1])) fail(where + ': кривой tw')
      if (typeof seed.mins !== 'number') fail(where + ': нет mins')
      if (!Array.isArray(seed.model) || !seed.model.length) fail(where + ': пустой model')
      if (!Array.isArray(seed.phr) || !seed.phr.length) fail(where + ': пустой phr')
      for (const grp of seed.phr) {
        if (!Array.isArray(grp) || typeof grp[0] !== 'string' || !Array.isArray(grp[1])) fail(where + ': кривая группа phr')
        for (const p of grp[1]) if (!isTriple(p)) fail(where + ': фраза не тройка [en,ru,kk]: ' + JSON.stringify(p))
      }
      if (!Array.isArray(seed.words) || !seed.words.length) fail(where + ': пустой words')
      for (const w of seed.words) if (!isTriple(w)) fail(where + ': слово не тройка [en,ru,kk]: ' + JSON.stringify(w))
      if (!Array.isArray(seed.sent) || seed.sent.length < 8) fail(where + ': sent меньше 8 (нужно на подборки по 8)')
      for (const s of seed.sent) {
        if (!Array.isArray(s) || typeof s[0] !== 'string') fail(where + ': кривой sent')
        if (!RULES[s[1]]) fail(where + ': неизвестный rule-tag «' + s[1] + '»')
      }
      if (!Array.isArray(seed.ideas) || !seed.ideas.length) fail(where + ': пустой ideas')
      total++
    }
  }
  if (total !== LEVELS.length * SEEDS_PER_LEVEL) fail('всего жанров ' + total)
  return total
}

// ── Запись ───────────────────────────────────────────────────────────────
function writeJson(file, obj, pretty) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(obj, null, pretty ? 2 : undefined) + '\n', 'utf8')
}

function run(srcPath) {
  const html = fs.readFileSync(srcPath, 'utf8')
  const sandbox = evalPrototype(html)
  const total = validate(sandbox)

  for (const level of LEVELS) {
    writeJson(path.join(OUT_DIR, level + '.json'), {
      level,
      seeds: sandbox.SEEDS[level],
      bank: sandbox.BANKS[level],
    })
  }

  // В рантайм едет только то, чем пользуется движок и тренажёр; словари
  // интерфейса — отдельным файлом-источником, чтобы meta.json не таскал
  // мёртвый вес в каждый браузер.
  writeJson(path.join(OUT_DIR, 'meta.json'), {
    rules: sandbox.RULES,
    fnWhy: sandbox.FN_WHY,
    levelTitles: sandbox.LEVEL_TITLES,
    levelTag: sandbox.LEVEL_TAG,
    titles: sandbox.TITLES,
    howto: sandbox.HOWTO,
  })

  writeJson(I18N_SOURCE, {
    ui: sandbox.UI,
    uiExtra: sandbox.UI_EXTRA,
    rulesRu: sandbox.RULES_RU,
    rulesKk: sandbox.RULES_KK,
    titles: sandbox.TITLES,
    titlesRu: sandbox.TITLES_RU,
    titlesKk: sandbox.TITLES_KK,
    typeLabel: sandbox.TYPE_LABEL,
    typeLabelRu: sandbox.TYPE_LABEL_RU,
    typeLabelKk: sandbox.TYPE_LABEL_KK,
    howto: sandbox.HOWTO,
    howtoRu: sandbox.HOWTO_RU,
    howtoKk: sandbox.HOWTO_KK,
  }, true)

  // Эталонные фикстуры: считает САМ прототип, не наш порт.
  for (const level of LEVELS) {
    const genre = sandbox.buildGenre(sandbox.SEEDS[level][0], sandbox.BANKS[level])
    writeJson(path.join(FIXTURES_DIR, 'genre-' + level + '.json'), genre, true)
  }

  console.log('[extract-writing] ok: ' + total + ' жанров → ' + path.relative(ROOT, OUT_DIR))
}

module.exports = { slicePrototype, evalPrototype, validate, LEVELS, SEEDS_PER_LEVEL, BANK_KEYS, DEFAULT_SRC }

if (require.main === module) {
  const argIdx = process.argv.indexOf('--src')
  run(argIdx > 0 ? process.argv[argIdx + 1] : DEFAULT_SRC)
}
