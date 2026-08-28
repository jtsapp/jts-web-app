// Извлекает данные воркбука из data/jtsworkbook-<level>.html — закоммиченного
// прототипа (source of truth). Данные в прототипе — это JavaScript (UNITS/WB и
// пост-обработка, которая доклеивает игру в пары, разбивает turn на write+speak
// и собирает словарь ревью), поэтому не парсим руками, а даём V8 исполнить
// вырезанный кусок в песочнице node:vm. Срез — по текстовым маркерам, а не по
// номерам строк: номера умирают при первом же ре-экспорте прототипа.
//
// Запуск: node scripts/extract-workbook.js [--level a0] [--src <путь к html>]
//
// Пишет:
//   public/practice/workbook/<level>/index.json      — каталог: юниты, уроки, счётчики
//   public/practice/workbook/<level>/lesson-<n>.json — тело урока (задания целиком)
//   public/practice/workbook/<level>/meta.json       — то, что нужно плееру в рантайме
//   scripts/workbook-i18n-source.json                — ru/kk словарь интерфейса прототипа:
//       одноразовый источник для ручного порта ключей в src/i18n.jsx,
//       в рантайм НЕ подключается
//   src/practice/workbook/__fixtures__/oracle-<level>.json — вывод ПРОТОТИПНЫХ
//       shuffle/optOrder/nrm: порядок элементов и вердикты грейдера. Оракул, с
//       которым сверяется порт движка в engine.test.js. Дрейф порта = красный тест.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const ROOT = path.join(__dirname, '..')
const OUT_ROOT = path.join(ROOT, 'public', 'practice', 'workbook')
const FIXTURES_DIR = path.join(ROOT, 'src', 'practice', 'workbook', '__fixtures__')
const I18N_SOURCE = path.join(__dirname, 'workbook-i18n-source.json')

// Ожидаемые счётчики: расходятся — значит прототип перевыпустили с другим
// содержимым, и молча пересобирать данные под новый объём нельзя.
//
// Уровни устроены по-разному, и это НЕ ошибка данных: у A1 юнит-ревью нет
// вовсе, у A2/B1 ревью-урок есть у каждого юнита (101…112) и он же зачётный
// тест, у B2 тест один на три юнита (201…204). Ждём ровно то, что лежит
// в прототипе, иначе «проверка» выродится в пересчёт самой себя.
const UNIT_REVIEWS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112]
const EXPECT = {
  a0: {
    units: 7, lessons: 31, tests: [],
    reviews: [101, 102, 103, 104, 105, 106, 107],
    challenges: [101, 102, 103, 104, 105, 106, 107],
  },
  // У A1 итоговых уроков-«сто первых» нет: челленджем работают обычные уроки
  // 12, 24 и 32 — последние в своих юнитах.
  a1: { units: 8, lessons: 32, reviews: [], tests: [], challenges: [12, 24, 32] },
  a2: {
    units: 12, lessons: 48, reviews: UNIT_REVIEWS, tests: UNIT_REVIEWS,
    challenges: UNIT_REVIEWS,
  },
  b1: {
    units: 12, lessons: 48, reviews: UNIT_REVIEWS, tests: UNIT_REVIEWS,
    challenges: UNIT_REVIEWS,
  },
  b2: {
    units: 12, lessons: 52, reviews: [201, 202, 203, 204], tests: [201, 202, 203, 204],
    challenges: [201, 202, 203, 204],
  },
}

// Типы заданий, которые умеет рисовать порт. Новый тип из прототипа обязан
// уронить сборку, а не тихо превратиться в пустой экран у студента.
const TOP_TYPES = [
  'listen', 'read', 'respond', 'chat', 'write', 'speak', 'order', 'fix', 'choose',
  'drop', 'bank', 'odd', 'type', 'table', 'sort', 'match', 'label', 'memo',
  // A1 и старше: трансформация предложения плитками.
  'trans',
  // B1 и старше: набранная трансформация, словообразование, разбор образца,
  // модельный текст.
  'ttrans', 'wform', 'worked', 'model',
  // B2: правило с примерами, цепочка из двух перезаписей, поиск ошибок в
  // абзаце, сплошной текст с банком слов, зачётная викторина, видео-репортаж.
  'rule', 'chain', 'epara', 'cloze', 'quiz', 'video',
]
const NESTED_TYPES = ['tf', 'choose', 'seq', 'match', 'type', 'bank', 'sort', 'odd', 'label']
// Типы-обёртки: сами ничего не судят, под ними лежит обычное задание (task).
const WRAPPER_TYPES = ['listen', 'read', 'rule', 'model', 'worked', 'video']
// Типы, которые «Разбор ошибок» умеет резать до одних промахов (порт
// SUBSETTABLE). Список СВОЙ у каждого уровня: A1/A2 не режут trans, а B1/B2 не
// режут order/label — так в прототипах, и расхождение здесь меняет то, какие
// задания студент проходит в разборе целиком.
const SUBSETTABLE = {
  a0: ['type', 'choose', 'tf', 'odd', 'label', 'respond', 'bank', 'match', 'order', 'fix'],
  a1: ['type', 'choose', 'tf', 'odd', 'label', 'respond', 'bank', 'match', 'order', 'fix'],
  a2: ['type', 'choose', 'tf', 'odd', 'label', 'respond', 'bank', 'match', 'order', 'fix'],
  b1: ['type', 'wform', 'choose', 'tf', 'odd', 'respond', 'bank', 'match', 'fix', 'trans', 'ttrans'],
  b2: ['type', 'wform', 'choose', 'tf', 'odd', 'respond', 'bank', 'match', 'fix', 'trans', 'ttrans', 'chain'],
}

function fail(msg) {
  throw new Error('[extract-workbook] ' + msg)
}

// ── Срезы прототипа ──────────────────────────────────────────────────────
// Слой данных: от "var UI={" до "var S={lang:" (первая строка состояния движка).
// Баннер «practice-first workbook» обязан лежать ВНУТРИ среза — это страховка
// от того, что кто-то переставил куски прототипа и в «данные» уехал рендер.
function slicePrototype(html) {
  const dataStart = html.indexOf('var UI={')
  if (dataStart < 0) fail('не найден маркер начала данных var UI={ — прототип изменил структуру')
  const dataEnd = html.indexOf('var S={lang:')
  if (dataEnd < 0) fail('не найден маркер конца данных var S={lang: — конец данных неизвестен')
  if (dataEnd < dataStart) fail('состояние движка встретилось раньше данных — срез небезопасен')

  const banner = html.indexOf('practice-first workbook')
  if (banner < 0 || banner < dataStart || banner > dataEnd) {
    fail('баннер «practice-first workbook» не найден внутри среза — структура прототипа изменилась')
  }
  const data = html.slice(dataStart, dataEnd)

  // Слой данных обязан быть чистым: без DOM и браузерных API. Ловим только
  // код-образные формы — голое слово window легально в учебных текстах, а
  // обращение через точку поймало бы и точку в конце предложения.
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

  // Движковый мини-срез: три куска, которые нужны не рантайму, а генератору
  // эталонов — прототипные shuffle/optOrder/nrm считают фикстуры сами.
  const engine = [
    cut(html, 'function shuffle', 'function lessonList', 'shuffle'),
    cut(html, 'function numericLadder', 'function noteEl', 'numericLadder/optOrder'),
    cut(html, 'function nrm(s)', 'R.type={', 'nrm'),
  ].join('\n')

  return { data, engine }
}

/**
 * Как прототип узнаёт «челлендж» — урок, который каталог помечает звёздочкой
 * вместо номера. Правило у каждого уровня своё и живёт В РЕНДЕРЕ (`var isRev=`),
 * а не в данных: A0 смотрит на поле юнита, A2–B2 на номер урока, а A1 держит
 * жёсткий список — у него нет отдельных итоговых уроков, челленджем работают
 * последние уроки юнитов. Читаем правило из самого прототипа: свой список тут
 * молча разъехался бы с исходником на первой же его правке.
 */
function challengeRule(html) {
  const m = html.match(/var isRev\s*=\s*([^;]+);/)
  if (!m) fail('не найдено правило челленджа (var isRev=…) — каталог прототипа изменился')
  const expr = m[1].replace(/\s+/g, '')
  if (expr === 'u.rev===n') return (n, revs) => revs.has(n)
  const gt = expr.match(/^n>(\d+)$/)
  if (gt) return (n) => n > Number(gt[1])
  const list = expr.match(/^\[([\d,]+)\]\.indexOf\(n\)>-1$/)
  if (list) {
    const ns = new Set(list[1].split(',').map(Number))
    return (n) => ns.has(n)
  }
  fail('незнакомое правило челленджа «' + expr + '» — порт его не повторит')
}

function cut(html, from, to, what) {
  const a = html.indexOf(from)
  const b = html.indexOf(to, a + 1)
  if (a < 0 || b < 0) fail('не найден блок ' + what + ' (' + from + ' … ' + to + ')')
  return html.slice(a, b)
}

// ── Исполнение в песочнице ───────────────────────────────────────────────
function evalPrototype(html) {
  const { data, engine } = slicePrototype(html)
  const sandbox = {}
  vm.createContext(sandbox)
  vm.runInContext(data, sandbox, { timeout: 10000, filename: 'jtsworkbook-data.js' })
  vm.runInContext(engine, sandbox, { timeout: 10000, filename: 'jtsworkbook-engine.js' })

  // Обязательный минимум — то, без чего данных нет вовсе. Фразы «на уроке»
  // (CLASS/CLH) и подсказки TIP есть только у A0: с A1 автор их не выпускает,
  // и требовать их — значит уронить сборку на живом прототипе.
  const wanted = ['UI', 'INS', 'UNITS', 'WB', 'GR', 'CAN', 'shuffle', 'optOrder', 'numericLadder', 'nrm']
  for (const name of wanted) {
    if (sandbox[name] === undefined) fail('в песочнице не оказалось ' + name + ' — прототип переименовал переменную')
  }
  return sandbox
}

/**
 * Судья набранного ответа ЭТОГО прототипа. У каждого уровня он свой, и разница
 * не косметическая: A1 прощает пропущенный апостроф вторым проходом, A2 —
 * по списку британских/американских пар, B1/B2 раскрывают сокращения в полные
 * формы. Берём ту функцию, которая реально лежит в файле, а не «свою общую».
 */
function matcherOf(sb) {
  if (typeof sb.typedOk === 'function') return (input, keys) => sb.typedOk(input, keys)
  if (typeof sb.answerMatches === 'function') return (input, keys) => sb.answerMatches(sb.nrm(input), keys)
  if (typeof sb.loose === 'function') {
    return (input, keys) => {
      const v = sb.nrm(input)
      const vl = sb.loose(input)
      return !!v && keys.some((k) => sb.nrm(k) === v || sb.loose(k) === vl)
    }
  }
  return (input, keys) => {
    const v = sb.nrm(input)
    return !!v && keys.some((k) => sb.nrm(k) === v)
  }
}

// ── Валидации (fail, не warn: тихо испорченные данные хуже упавшего скрипта) ─
function lessonNumbers(WB) {
  return Object.keys(WB).map(Number).sort((a, b) => a - b)
}

function checkAct(a, where, insTable, nested) {
  const allowed = nested ? NESTED_TYPES : TOP_TYPES
  if (!a || typeof a.t !== 'string') fail(where + ': задание без типа')
  if (!allowed.includes(a.t)) fail(where + ': неизвестный тип «' + a.t + '» — порт его не рисует')

  const items = a.items || []
  switch (a.t) {
    case 'choose':
    case 'odd':
    case 'label':
    case 'respond':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (!Array.isArray(it.o) || it.o.length < 2) fail(where + '/' + k + ': меньше двух вариантов')
        if (typeof it.a !== 'number' || it.a < 0 || it.a >= it.o.length) fail(where + '/' + k + ': ключ не индекс в вариантах')
      })
      break
    case 'tf':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (typeof it.s !== 'string' || !it.s) fail(where + '/' + k + ': tf без утверждения')
        if (typeof it.a !== 'boolean') fail(where + '/' + k + ': tf-ключ не булево')
      })
      break
    case 'type':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (typeof it.a !== 'string' || !it.a) fail(where + '/' + k + ': type без ключа')
        if (it.alt && !Array.isArray(it.alt)) fail(where + '/' + k + ': alt не массив')
      })
      break
    case 'bank':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (typeof it.a !== 'string' || !it.a) fail(where + '/' + k + ': bank без ключа')
        if (String(it.s || '').indexOf('___') < 0) fail(where + '/' + k + ': bank без пропуска')
      })
      break
    case 'match':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (!it.l || !it.r) fail(where + '/' + k + ': match без пары')
      })
      break
    case 'order':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (!Array.isArray(it.w) || !it.w.length) fail(where + '/' + k + ': order без слов')
        if (typeof it.a !== 'string' || !it.a) fail(where + '/' + k + ': order без эталона')
        // Собранное предложение сверяется строкой — набор слов обязан её давать.
        const got = it.w.slice().sort().join(' ')
        const want = it.a.split(' ').slice().sort().join(' ')
        if (got !== want) fail(where + '/' + k + ': слова не складываются в эталон «' + it.a + '»')
      })
      break
    case 'fix':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (!Array.isArray(it.w) || !it.w.length) fail(where + '/' + k + ': fix без слов')
        if (typeof it.bad !== 'number' || !it.w[it.bad]) fail(where + '/' + k + ': индекс ошибки не указывает на слово')
        if (typeof it.fix !== 'string' || !it.fix) fail(where + '/' + k + ': fix без замены')
      })
      break
    case 'sort':
      if (!Array.isArray(a.cols) || a.cols.length < 2) fail(where + ': sort меньше двух колонок')
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (typeof it.c !== 'number' || !a.cols[it.c]) fail(where + '/' + k + ': колонка не существует')
      })
      break
    case 'seq':
      if (items.length < 2) fail(where + ': seq меньше двух пунктов')
      break
    case 'table': {
      if (!Array.isArray(a.head) || !Array.isArray(a.rows)) fail(where + ': table без шапки или строк')
      let gaps = 0
      a.rows.forEach((row) => row.forEach((cell) => { if (String(cell).indexOf('___|') === 0) gaps++ }))
      if (!gaps) fail(where + ': в таблице нет ни одного пропуска')
      break
    }
    case 'chat': {
      if (!Array.isArray(a.lines) || !a.lines.length) fail(where + ': chat без реплик')
      if (!Array.isArray(a.bank) || !a.bank.length) fail(where + ': chat без банка слов')
      const gaps = a.lines.filter((ln) => String(ln.s).indexOf('___') > -1)
      if (!gaps.length) fail(where + ': в диалоге нет пропусков')
      gaps.forEach((ln, k) => { if (!ln.a) fail(where + '/' + k + ': реплика с пропуском без ключа') })
      break
    }
    case 'drop': {
      if (!Array.isArray(a.lines) || !a.lines.length) fail(where + ': drop без строк')
      let picks = 0
      a.lines.forEach((ln) => { picks += (String(ln).match(/\[[^\]]*\]/g) || []).length })
      if (!picks) fail(where + ': в тексте нет ни одного выбора в скобках')
      break
    }
    case 'memo':
      if (!Array.isArray(a.pairs) || !a.pairs.length) fail(where + ': memo без пар')
      break
    case 'write':
      if (!a.write || !a.write.q) fail(where + ': write без вопроса')
      break
    case 'speak':
      if (!a.speak || !a.speak.q) fail(where + ': speak без вопроса')
      break
    case 'listen':
      if (!a.task) fail(where + ': listen без вложенного задания')
      // Учебник пишет id трека и через подчёркивание («01_08» у A0–A2), и
      // через точку («10.7» у B1/B2) — обе формы легальны, ловим только мусор.
      if (a.track && !/^\d+[._]\d+$/.test(a.track)) fail(where + ': кривой id трека «' + a.track + '»')
      checkAct(a.task, where + '>task', insTable, true)
      break
    case 'read':
      if (!a.task) fail(where + ': read без вложенного задания')
      if (!Array.isArray(a.text) || !a.text.length) fail(where + ': read без текста')
      checkAct(a.task, where + '>task', insTable, true)
      break
    case 'video':
      if (!a.task) fail(where + ': video без вложенного задания')
      // Ролика в прототипе нет, есть расшифровка: без неё экран немой.
      if (!Array.isArray(a.tts) || !a.tts.length) fail(where + ': video без расшифровки')
      checkAct(a.task, where + '>task', insTable, true)
      break
    case 'model':
      if (!a.task) fail(where + ': model без вложенного задания')
      if (!Array.isArray(a.text) || !a.text.length) fail(where + ': model без текста образца')
      checkAct(a.task, where + '>task', insTable, true)
      break
    case 'worked':
      if (!a.task) fail(where + ': worked без вложенного задания')
      if (!Array.isArray(a.steps) || !a.steps.length) fail(where + ': worked без шагов разбора')
      a.steps.forEach((s, k) => {
        if (!Array.isArray(s) || !s[0]) fail(where + '/' + k + ': шаг разбора без строки')
      })
      checkAct(a.task, where + '>task', insTable, true)
      break
    case 'rule':
      if (!a.task) fail(where + ': rule без вложенного задания')
      if ((!Array.isArray(a.rule) || !a.rule.length) && (!Array.isArray(a.points) || !a.points.length)) {
        fail(where + ': rule без объяснения')
      }
      ;(a.points || []).forEach((p, k) => {
        if (!Array.isArray(p) || !p[0] || !p[1]) fail(where + '/' + k + ': пункт правила без названия или пояснения')
      })
      ;(a.eg || []).forEach((e, k) => {
        if (!Array.isArray(e) || !e[0]) fail(where + '/eg' + k + ': пример без предложения')
      })
      checkAct(a.task, where + '>task', insTable, true)
      break
    case 'trans':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (!it.from) fail(where + '/' + k + ': trans без исходного предложения')
        if (!it.cue) fail(where + '/' + k + ': trans без задания на переделку')
        if (!Array.isArray(it.w) || !it.w.length) fail(where + '/' + k + ': trans без слов')
        if (typeof it.a !== 'string' || !it.a) fail(where + '/' + k + ': trans без эталона')
        const got = it.w.slice().sort().join(' ')
        const want = it.a.split(' ').slice().sort().join(' ')
        if (got !== want) fail(where + '/' + k + ': слова не складываются в эталон «' + it.a + '»')
      })
      break
    case 'ttrans':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (!it.cue) fail(where + '/' + k + ': ttrans без задания на переделку')
        if (typeof it.a !== 'string' || !it.a) fail(where + '/' + k + ': ttrans без ключа')
        if (it.alt && !Array.isArray(it.alt)) fail(where + '/' + k + ': alt не массив')
      })
      break
    case 'wform':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (typeof it.q !== 'string' || it.q.indexOf('___') < 0) fail(where + '/' + k + ': wform без пропуска')
        if (!it.root) fail(where + '/' + k + ': wform без исходного слова')
        if (typeof it.a !== 'string' || !it.a) fail(where + '/' + k + ': wform без ключа')
      })
      break
    case 'chain':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (!it.from) fail(where + '/' + k + ': chain без исходного предложения')
        if (!Array.isArray(it.steps) || it.steps.length < 2) fail(where + '/' + k + ': chain меньше двух шагов')
        it.steps.forEach((st, j) => {
          if (!st.cue) fail(where + '/' + k + '.' + j + ': шаг цепочки без задания')
          if (typeof st.a !== 'string' || !st.a) fail(where + '/' + k + '.' + j + ': шаг цепочки без ключа')
        })
      })
      break
    case 'epara':
      if (!Array.isArray(a.words) || !a.words.length) fail(where + ': epara без текста')
      if (!Array.isArray(a.bad) || !a.bad.length) fail(where + ': epara без ошибок')
      a.bad.forEach((b, k) => {
        if (typeof b.i !== 'number' || !a.words[b.i]) fail(where + '/' + k + ': индекс ошибки не указывает на слово')
        if (!b.fix) fail(where + '/' + k + ': ошибка без правки')
      })
      break
    case 'cloze': {
      if (!Array.isArray(a.text) || !a.text.length) fail(where + ': cloze без текста')
      if (!Array.isArray(a.bank) || !a.bank.length) fail(where + ': cloze без банка слов')
      if (!Array.isArray(a.gaps) || !a.gaps.length) fail(where + ': cloze без ключей')
      const gaps = a.text.reduce((n, line) => n + String(line).split('___').length - 1, 0)
      if (gaps !== a.gaps.length) fail(where + ': пропусков ' + gaps + ', ключей ' + a.gaps.length)
      a.gaps.forEach((g, k) => {
        if (!a.bank.includes(g)) fail(where + '/' + k + ': ключа «' + g + '» нет в банке слов')
      })
      break
    }
    case 'quiz':
      if (!items.length) fail(where + ': пустые items')
      items.forEach((it, k) => {
        if (!it.q) fail(where + '/' + k + ': вопрос без текста')
        if (!Array.isArray(it.o) || it.o.length < 2) fail(where + '/' + k + ': меньше двух вариантов')
        if (typeof it.a !== 'number' || it.a < 0 || it.a >= it.o.length) fail(where + '/' + k + ': ключ не индекс в вариантах')
      })
      break
    default:
      fail(where + ': тип «' + a.t + '» не описан в валидаторе')
  }

  // Инструкция обязана резолвиться: пустая шапка задания = экран без условия.
  const insKey = a.ins || (a.task && a.task.ins)
  if (!nested && typeof insKey === 'string' && !insTable[insKey]) {
    fail(where + ': инструкция «' + insKey + '» не найдена в INS')
  }
}

function validate(sandbox, level, isChallenge) {
  const { UNITS, WB, INS } = sandbox
  const expect = EXPECT[level]
  if (!expect) fail('нет ожидаемых счётчиков для уровня ' + level)

  if (UNITS.length !== expect.units) fail('юнитов ' + UNITS.length + ', ждали ' + expect.units)
  const nums = lessonNumbers(WB)
  if (nums.length !== expect.lessons) fail('уроков ' + nums.length + ', ждали ' + expect.lessons)

  // Ревью привязано к юниту полем rev, и у части уровней его нет вовсе (A1)
  // или оно есть у каждого третьего юнита (B2) — считаем только настоящие.
  const revs = UNITS.map((u) => u.rev).filter((n) => n != null).sort((a, b) => a - b)
  if (revs.join(',') !== expect.reviews.join(',')) {
    fail('ревью ' + revs.join(',') + ', ждали ' + expect.reviews.join(','))
  }
  const challenges = nums.filter((n) => isChallenge(n, new Set(revs))).sort((a, b) => a - b)
  if (challenges.join(',') !== expect.challenges.join(',')) {
    fail('челленджей ' + challenges.join(',') + ', ждали ' + expect.challenges.join(','))
  }
  const tests = nums.filter((n) => WB[n].test).sort((a, b) => a - b)
  if (tests.join(',') !== expect.tests.join(',')) {
    fail('зачётных уроков ' + tests.join(',') + ', ждали ' + expect.tests.join(','))
  }
  tests.forEach((n) => { if (!revs.includes(n)) fail('зачётный урок ' + n + ' не привязан ни к одному юниту') })
  UNITS.forEach((u) => {
    if (u.rev != null && !WB[u.rev]) fail('юнит ' + u.n + ': ревью ' + u.rev + ' не существует')
    u.ls.forEach((n) => { if (!WB[n]) fail('юнит ' + u.n + ': урок ' + n + ' не существует') })
  })

  // Каждый урок обязан лежать ровно в одном юните — иначе он недостижим с карты.
  const seen = new Set()
  UNITS.forEach((u) => {
    u.ls.concat(u.rev == null ? [] : [u.rev]).forEach((n) => {
      if (seen.has(n)) fail('урок ' + n + ' попал в два юнита')
      seen.add(n)
    })
  })
  nums.forEach((n) => { if (!seen.has(n)) fail('урок ' + n + ' не привязан ни к одному юниту') })

  let acts = 0
  let vocShape = ''
  nums.forEach((n) => {
    const W = WB[n]
    if (typeof W.title !== 'string' || !W.title) fail('урок ' + n + ': нет заголовка')
    if (!Array.isArray(W.acts) || !W.acts.length) fail('урок ' + n + ': нет заданий')
    if (!Array.isArray(W.voc)) fail('урок ' + n + ': нет словаря')
    W.voc.forEach((v, k) => {
      if (!Array.isArray(v) || v.length < 3 || v.length > 4) fail('урок ' + n + ', слово ' + k + ': не тройка [en,ru,kk]')
      if (v.slice(0, 3).some((s) => typeof s !== 'string' || !s)) fail('урок ' + n + ', слово ' + k + ': пустая часть перевода')
      // Форма словаря — часть контракта с плеером: [en,ru,kk,emoji] у A0–B1 и
      // [en,английское определение,emoji] у B2. Перепутать их — значит выдать
      // казахскому студенту эмодзи вместо перевода, и молча.
      const shape = v.length === 4 ? 'ru-kk' : 'def'
      if (vocShape && vocShape !== shape) fail('урок ' + n + ', слово ' + k + ': словарь уровня смешал формы')
      vocShape = shape
    })
    W.acts.forEach((a, i) => {
      // turn обязан быть разложен пост-обработкой прототипа: в рантайм он не едет.
      if (a.t === 'turn') fail('урок ' + n + '/' + i + ': turn не разбит на write+speak')
      checkAct(a, 'урок ' + n + '/' + i, INS, false)
      acts++
    })
  })

  return { lessons: nums.length, acts, vocShape: vocShape || 'ru-kk' }
}

// ── Оракул: считает САМ прототип, не наш порт ────────────────────────────
// Для каждого задания с перемешиванием — итоговый порядок; для type — вердикты
// грейдера на ключах и околопромахах. Порт сверяется с этим бит-в-бит.
function mutations(answer) {
  const s = String(answer)
  return [
    s,
    s.toUpperCase(),
    '  ' + s + ' ',
    s + '.',
    s.replace(/'/g, '’'),
    s.replace(/-/g, ' '),
    '"' + s + '"',
    s + ' x',
  ]
}

function oracleAct(sb, a, where, matcher) {
  const { shuffle, optOrder } = sb
  const judge = matcher || matcherOf(sb)
  const o = { where, t: a.t }
  const idx = (n) => Array.from({ length: n }, (_, k) => k)

  /** Вердикты грейдера на ключе и околопромахах — тем судьёй, что у уровня. */
  const gradeRows = (key, alt) => {
    const keys = [key].concat(alt || [])
    let inputs = mutations(key)
    keys.slice(1).forEach((k) => { inputs = inputs.concat(mutations(k)) })
    return inputs.map((input) => ({ in: input, ok: judge(input, keys) }))
  }

  switch (a.t) {
    case 'choose':
    case 'odd':
    case 'label':
    case 'respond':
    // Викторина B2 показывает вопросы по одному, но порядок вариантов считает
    // тем же optOrder — иначе «правильная» кнопка уехала бы.
    case 'quiz':
      o.orders = a.items.map((it, i) => optOrder(a, it, i))
      o.right = o.orders.map((ord, i) => ord.indexOf(a.items[i].a))
      break
    case 'tf':
      // Прототип нормализует tf в pick с nosh:true — порядок всегда [0,1].
      o.orders = a.items.map(() => [0, 1])
      o.right = a.items.map((it) => (it.a ? 0 : 1))
      break
    case 'bank':
      o.bank = shuffle(a.bank || a.items.map((x) => x.a), a.seed || 3)
      break
    case 'match':
      o.bank = shuffle(a.items.map((x) => x.r), a.seed || 11)
      break
    case 'table': {
      const answers = []
      a.rows.forEach((row) => row.forEach((cell) => {
        if (String(cell).indexOf('___|') === 0) answers.push(String(cell).slice(4))
      }))
      o.answers = answers
      o.bank = shuffle(answers, a.seed || 23)
      break
    }
    case 'chat':
      o.bank = shuffle(a.bank, a.seed || 19)
      break
    case 'order':
      o.tiles = a.items.map((it, i) => shuffle(it.w, (i + 1) * 13 + (a.seed || 5)))
      break
    // Трансформация плитками: у неё СВОЙ сид (31 против 5 у order) и своя
    // формула — перепутать их значит выдать другой порядок слов в лотке.
    case 'trans':
      o.tiles = a.items.map((it, i) => shuffle(idx(it.w.length), (a.seed || 31) + i * 13).map((k) => it.w[k]))
      break
    case 'cloze':
      o.bank = shuffle(a.bank, a.seed || 3)
      break
    case 'sort':
      o.order = shuffle(idx(a.items.length), a.seed || 17)
      break
    case 'seq':
      o.order = shuffle(idx(a.items.length), a.seed || 13)
      break
    case 'memo':
      // Колода — по две карточки на пару, порядок как в прототипе.
      o.order = shuffle(idx(a.pairs.length * 2), a.seed || 37)
      break
    case 'drop': {
      o.picks = []
      a.lines.forEach((ln, li) => {
        String(ln).split(/(\[[^\]]*\])/).forEach((part, pi) => {
          if (part.charAt(0) !== '[') return
          const opts = part.slice(1, -1).split('|')
          o.picks.push({ li, pi, order: shuffle(idx(opts.length), (a.seed || 9) + li * 13 + pi * 7 + part.length) })
        })
      })
      break
    }
    case 'type':
    case 'ttrans':
    case 'wform':
      o.grade = a.items.map((it) => gradeRows(it.a, it.alt))
      break
    case 'chain':
      o.grade = a.items.map((it) => it.steps.map((st) => gradeRows(st.a, st.alt)))
      break
    case 'listen':
    case 'read':
    case 'rule':
    case 'model':
    case 'worked':
    case 'video':
      o.task = oracleAct(sb, a.task, where + '>task', judge)
      break
    default:
      break
  }
  return o
}

// ── Запись ───────────────────────────────────────────────────────────────
function writeJson(file, obj, pretty) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(obj, null, pretty ? 2 : undefined) + '\n', 'utf8')
}

function run(level, srcPath) {
  const html = fs.readFileSync(srcPath, 'utf8')
  const sb = evalPrototype(html)
  const isChallenge = challengeRule(html)
  const stats = validate(sb, level, isChallenge)
  const outDir = path.join(OUT_ROOT, level)

  const { UNITS, WB, INS, CLH } = sb
  const nums = lessonNumbers(WB)

  // Итоговые уроки каталог помечает звёздочкой, а не номером, и признак этот
  // НЕ равен «у юнита есть rev»: у A1 rev нет вовсе, а челленджами работают
  // обычные уроки 12/24/32. Правило берём из самого прототипа (challengeRule).
  const revs = new Set(UNITS.map((u) => u.rev).filter((n) => n != null))
  // Номер юнита нужен уроку, а не только каталогу: по нему воркбук B2 находит
  // видео-репортаж в аудио-визуальном материале курса (public/course/b2/video).
  const unitOf = {}
  UNITS.forEach((u) => u.ls.concat(u.rev == null ? [] : [u.rev]).forEach((n) => { unitOf[n] = u.n }))

  const lessons = {}
  nums.forEach((n) => {
    const W = WB[n]
    lessons[n] = {
      title: W.title,
      unit: unitOf[n],
      fn: W.fn || null,
      gr: W.gr || null,
      test: !!W.test,
      review: isChallenge(n, revs),
      acts: W.acts.length,
      voc: W.voc.length,
      // Типы заданий — из них плеер рисует «маршрут» урока на карточке.
      types: W.acts.map((a) => a.t),
    }
    writeJson(path.join(outDir, 'lesson-' + n + '.json'), {
      n,
      unit: unitOf[n],
      title: W.title,
      fn: W.fn || null,
      gr: W.gr || null,
      can: W.can || null,
      tip: W.tip || null,
      // «Полезный язык» (A1+) и «что повторяем» (B1+) — свои поля урока, а не
      // разновидность tip: они показываются в разных местах карточки.
      useful: W.useful || null,
      rc: W.rc || null,
      test: !!W.test,
      voc: W.voc,
      acts: W.acts,
    })
  })

  writeJson(path.join(outDir, 'index.json'), {
    level,
    units: UNITS.map((u) => ({ n: u.n, title: u.title, ls: u.ls, rev: u.rev == null ? null : u.rev })),
    lessons,
  })

  // В рантайм едет только то, чем пользуется плеер: инструкции к заданиям и
  // фразы «на уроке». Строки интерфейса переводит i18n приложения.
  writeJson(path.join(outDir, 'meta.json'), {
    level,
    ins: INS,
    classroom: CLH || null,
    subsettable: SUBSETTABLE[level],
    // Форма словаря уровня: ru-kk — [en,ru,kk,emoji], def — [en,английское
    // определение,emoji]. Плееру нужно ЗНАТЬ её, иначе он покажет казаху
    // эмодзи вместо перевода (у B2 перевода в источнике нет вовсе).
    voc: stats.vocShape,
  })

  // Словарь интерфейса прототипа — одноразовый источник для ручного порта
  // ключей в src/i18n.jsx. Копим по уровням в один файл: у B1/B2 половина
  // строк только английские, и видеть их рядом с уже переведёнными полезно.
  const i18nAll = fs.existsSync(I18N_SOURCE) ? JSON.parse(fs.readFileSync(I18N_SOURCE, 'utf8')) : {}
  const i18nLevels = i18nAll.levels && typeof i18nAll.levels === 'object' ? i18nAll.levels : {}
  i18nLevels[level] = sb.UI
  writeJson(I18N_SOURCE, { levels: i18nLevels }, true)

  const oracle = { level, acts: [] }
  const matcher = matcherOf(sb)
  nums.forEach((n) => {
    WB[n].acts.forEach((a, i) => oracle.acts.push(oracleAct(sb, a, n + '.' + i, matcher)))
  })
  writeJson(path.join(FIXTURES_DIR, 'oracle-' + level + '.json'), oracle, true)

  console.log(
    '[extract-workbook] ok: ' + level + ' — ' + stats.lessons + ' уроков, ' +
    stats.acts + ' заданий → ' + path.relative(ROOT, outDir)
  )
}

module.exports = {
  slicePrototype, evalPrototype, validate, oracleAct, matcherOf,
  EXPECT, TOP_TYPES, NESTED_TYPES, WRAPPER_TYPES, SUBSETTABLE,
}

if (require.main === module) {
  const argv = process.argv
  const lvlIdx = argv.indexOf('--level')
  const level = lvlIdx > 0 ? argv[lvlIdx + 1] : 'a0'
  const srcIdx = argv.indexOf('--src')
  const src = srcIdx > 0 ? argv[srcIdx + 1] : path.join(ROOT, 'data', 'jtsworkbook-' + level + '.html')
  run(level, src)
}
