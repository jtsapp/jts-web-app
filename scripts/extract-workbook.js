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
const EXPECT = {
  a0: { units: 7, lessons: 31, reviews: [101, 102, 103, 104, 105, 106, 107] },
}

// Типы заданий, которые умеет рисовать порт. Новый тип из прототипа обязан
// уронить сборку, а не тихо превратиться в пустой экран у студента.
const TOP_TYPES = [
  'listen', 'read', 'respond', 'chat', 'write', 'speak', 'order', 'fix', 'choose',
  'drop', 'bank', 'odd', 'type', 'table', 'sort', 'match', 'label', 'memo',
]
const NESTED_TYPES = ['tf', 'choose', 'seq', 'match', 'type', 'bank', 'sort', 'odd', 'label']
// Типы, которые «Разбор ошибок» умеет резать до одних промахов (порт SUBSETTABLE).
const SUBSETTABLE = ['type', 'choose', 'tf', 'odd', 'label', 'respond', 'bank', 'match', 'order', 'fix']

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

  const wanted = ['UI', 'INS', 'UNITS', 'WB', 'CLASS', 'CLH', 'TIP', 'GR', 'CAN', 'shuffle', 'optOrder', 'numericLadder', 'nrm']
  for (const name of wanted) {
    if (sandbox[name] === undefined) fail('в песочнице не оказалось ' + name + ' — прототип переименовал переменную')
  }
  return sandbox
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
      if (a.track && !/^\d\d_\d\d$/.test(a.track)) fail(where + ': кривой id трека «' + a.track + '»')
      checkAct(a.task, where + '>task', insTable, true)
      break
    case 'read':
      if (!a.task) fail(where + ': read без вложенного задания')
      if (!Array.isArray(a.text) || !a.text.length) fail(where + ': read без текста')
      checkAct(a.task, where + '>task', insTable, true)
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

function validate(sandbox, level) {
  const { UNITS, WB, INS } = sandbox
  const expect = EXPECT[level]
  if (!expect) fail('нет ожидаемых счётчиков для уровня ' + level)

  if (UNITS.length !== expect.units) fail('юнитов ' + UNITS.length + ', ждали ' + expect.units)
  const nums = lessonNumbers(WB)
  if (nums.length !== expect.lessons) fail('уроков ' + nums.length + ', ждали ' + expect.lessons)

  const revs = UNITS.map((u) => u.rev).sort((a, b) => a - b)
  if (revs.join(',') !== expect.reviews.join(',')) {
    fail('ревью ' + revs.join(',') + ', ждали ' + expect.reviews.join(','))
  }
  UNITS.forEach((u) => {
    if (!WB[u.rev]) fail('юнит ' + u.n + ': ревью ' + u.rev + ' не существует')
    u.ls.forEach((n) => { if (!WB[n]) fail('юнит ' + u.n + ': урок ' + n + ' не существует') })
  })

  // Каждый урок обязан лежать ровно в одном юните — иначе он недостижим с карты.
  const seen = new Set()
  UNITS.forEach((u) => {
    u.ls.concat([u.rev]).forEach((n) => {
      if (seen.has(n)) fail('урок ' + n + ' попал в два юнита')
      seen.add(n)
    })
  })
  nums.forEach((n) => { if (!seen.has(n)) fail('урок ' + n + ' не привязан ни к одному юниту') })

  let acts = 0
  nums.forEach((n) => {
    const W = WB[n]
    if (typeof W.title !== 'string' || !W.title) fail('урок ' + n + ': нет заголовка')
    if (!Array.isArray(W.acts) || !W.acts.length) fail('урок ' + n + ': нет заданий')
    if (!Array.isArray(W.voc)) fail('урок ' + n + ': нет словаря')
    W.voc.forEach((v, k) => {
      if (!Array.isArray(v) || v.length < 3 || v.length > 4) fail('урок ' + n + ', слово ' + k + ': не тройка [en,ru,kk]')
      if (v.slice(0, 3).some((s) => typeof s !== 'string' || !s)) fail('урок ' + n + ', слово ' + k + ': пустая часть перевода')
    })
    W.acts.forEach((a, i) => {
      // turn обязан быть разложен пост-обработкой прототипа: в рантайм он не едет.
      if (a.t === 'turn') fail('урок ' + n + '/' + i + ': turn не разбит на write+speak')
      checkAct(a, 'урок ' + n + '/' + i, INS, false)
      acts++
    })
  })

  return { lessons: nums.length, acts }
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

function oracleAct(sb, a, where) {
  const { shuffle, optOrder, nrm } = sb
  const o = { where, t: a.t }
  const idx = (n) => Array.from({ length: n }, (_, k) => k)

  switch (a.t) {
    case 'choose':
    case 'odd':
    case 'label':
    case 'respond':
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
      o.grade = a.items.map((it) => {
        const keys = [it.a].concat(it.alt || []).map(nrm)
        const rows = []
        let inputs = mutations(it.a)
        ;(it.alt || []).forEach((alt) => { inputs = inputs.concat(mutations(alt)) })
        inputs.forEach((input) => { rows.push({ in: input, ok: keys.includes(nrm(input)) }) })
        return rows
      })
      break
    case 'listen':
    case 'read':
      o.task = oracleAct(sb, a.task, where + '>task')
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
  const stats = validate(sb, level)
  const outDir = path.join(OUT_ROOT, level)

  const { UNITS, WB, INS, CLH } = sb
  const nums = lessonNumbers(WB)

  // Итоговые уроки юнита каталог помечает звёздочкой, а не номером. У A0 флага
  // `test` в данных нет (он появляется только с A2), поэтому «ревью» узнаём по
  // тому, что юнит указывает на этот урок полем rev.
  const reviews = new Set(UNITS.map((u) => u.rev))

  const lessons = {}
  nums.forEach((n) => {
    const W = WB[n]
    lessons[n] = {
      title: W.title,
      fn: W.fn || null,
      gr: W.gr || null,
      test: !!W.test,
      review: reviews.has(n),
      acts: W.acts.length,
      voc: W.voc.length,
      // Типы заданий — из них плеер рисует «маршрут» урока на карточке.
      types: W.acts.map((a) => a.t),
    }
    writeJson(path.join(outDir, 'lesson-' + n + '.json'), {
      n,
      title: W.title,
      fn: W.fn || null,
      gr: W.gr || null,
      can: W.can || null,
      tip: W.tip || null,
      test: !!W.test,
      voc: W.voc,
      acts: W.acts,
    })
  })

  writeJson(path.join(outDir, 'index.json'), {
    level,
    units: UNITS.map((u) => ({ n: u.n, title: u.title, ls: u.ls, rev: u.rev })),
    lessons,
  })

  // В рантайм едет только то, чем пользуется плеер: инструкции к заданиям и
  // фразы «на уроке». Строки интерфейса переводит i18n приложения.
  writeJson(path.join(outDir, 'meta.json'), {
    level,
    ins: INS,
    classroom: CLH,
    subsettable: SUBSETTABLE,
  })

  writeJson(I18N_SOURCE, { level, ui: sb.UI }, true)

  const oracle = { level, acts: [] }
  nums.forEach((n) => {
    WB[n].acts.forEach((a, i) => oracle.acts.push(oracleAct(sb, a, n + '.' + i)))
  })
  writeJson(path.join(FIXTURES_DIR, 'oracle-' + level + '.json'), oracle, true)

  console.log(
    '[extract-workbook] ok: ' + level + ' — ' + stats.lessons + ' уроков, ' +
    stats.acts + ' заданий → ' + path.relative(ROOT, outDir)
  )
}

module.exports = { slicePrototype, evalPrototype, validate, oracleAct, EXPECT, TOP_TYPES, NESTED_TYPES, SUBSETTABLE }

if (require.main === module) {
  const argv = process.argv
  const lvlIdx = argv.indexOf('--level')
  const level = lvlIdx > 0 ? argv[lvlIdx + 1] : 'a0'
  const srcIdx = argv.indexOf('--src')
  const src = srcIdx > 0 ? argv[srcIdx + 1] : path.join(ROOT, 'data', 'jtsworkbook-' + level + '.html')
  run(level, src)
}
