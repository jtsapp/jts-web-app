// Читает единый файл self-study курса нового поколения (jts-a0/a1/a2-course.html)
// — тот, где урок объявлен как `LESSONS[n] = (function(){ … const GROUPS = […] })()`.
//
// Почему не regex, как в scripts/extract-course-lessons.js: у этого курса урок —
// не литерал, а IIFE, и внутри неё задания ссылаются на локальные константы
// (INS, UI, BANK, персонажи вроде DANA). Вырезать литерал GROUPS текстом
// значит потерять эти ссылки. Поэтому скрипт файла выполняется целиком в
// node:vm с заглушкой DOM: движок курса при загрузке ищет свои узлы, но ничего
// не находит, а данные остаются в контексте.
//
// Три уровня — три способа хранить аудио, и это не прихоть авторов, а история
// файлов:
//   A0/A2 — const BLOBS = {хэш: "data:audio/mpeg;base64,…"} + BANKS[урок][ключ]
//   A1    — <script type="text/plain" id="a_<ключ>">base64</script> в разметке
// Поэтому аудио собирается в один плоский словарь ключ → base64 ещё здесь, и
// дальше по конвейеру про эту разницу знать никому не нужно.
const fs = require('node:fs')
const vm = require('node:vm')

// Объявления курса, которые нужны конвейеру. `const` на верхнем уровне скрипта
// не попадает в объект глобалей контекста (это не var), поэтому в конец кода
// дописывается эпилог, который перекладывает их в __out.
const EXPORTS = [
  'MENU',
  'MENU_DATA',
  'LESSONS',
  'BLOBS',
  'BANKS',
  'AUDIO',
  'PER_ITEM',
  'STAGES',
  'TOTAL_LESSONS',
  'TESTS',
  // Аудио B1 разложено по банкам юнитов: BANK1…BANK12.
  ...Array.from({ length: 12 }, (_, i) => `BANK${i + 1}`),
]

// Заглушка DOM. Любое обращение возвращает такую же заглушку, любой вызов —
// no-op: движку курса на старте нужны узлы (#stage, #go, …), обработчики и
// localStorage, и без них он падает на первой же строке, не дав прочитать
// данные. Symbol.toPrimitive нужен потому, что движок склеивает узлы в строки.
function domStub() {
  const handler = {
    get(target, prop) {
      if (prop === 'textContent' || prop === 'innerHTML' || prop === 'value') return ''
      if (prop === Symbol.toPrimitive) return () => ''
      if (prop === 'style' || prop === 'classList' || prop === 'dataset') return new Proxy({}, handler)
      if (prop === 'children' || prop === 'childNodes') return []
      if (typeof prop === 'string' && prop.startsWith('on')) return null
      return new Proxy(function () {}, handler)
    },
    set() {
      return true
    },
    apply() {
      return new Proxy(function () {}, handler)
    },
  }
  return new Proxy(function () {}, handler)
}

/** Скрипты курса (без хранилищ аудио — они тоже <script>, но type=text/plain). */
function courseScripts(html) {
  const out = []
  const re = /<script(?![^>]*type=["']text\/plain["'])[^>]*>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) out.push(m[1])
  return out
}

/** Аудио A1: <script type="text/plain" id="a_<ключ>">base64</script>. */
function inlineAudioTags(html) {
  const out = {}
  const re = /<script[^>]*type=["']text\/plain["'][^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) out[m[1]] = m[2].trim()
  return out
}

/** Код уровня из <title>: «Just To Study · A0 · English course». */
function readLevel(html, file) {
  const m = /<title>[^<]*?[·|-]\s*([A-C][0-2])\b/i.exec(html)
  if (!m) throw new Error(`не найден уровень в <title>: ${file}`)
  return m[1].toLowerCase()
}

function runCourse(html, file) {
  const audioTags = inlineAudioTags(html)
  const stub = domStub()
  const sandbox = {
    document: new Proxy(
      {},
      {
        get(target, prop) {
          // Движок A1 достаёт клип из разметки по id — отдаём настоящий base64,
          // иначе курс не соберёт свой AUDIO и часть заданий останется немой.
          if (prop === 'getElementById') return (id) => (audioTags[id] ? { textContent: audioTags[id] } : stub)
          if (prop === 'querySelector' || prop === 'querySelectorAll' || prop === 'createElement') return () => stub
          if (prop === 'addEventListener') return () => {}
          return stub
        },
      },
    ),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    Audio: function Audio() {
      return { play: () => Promise.resolve(), pause: () => {} }
    },
    location: { hash: '', search: '' },
    navigator: { language: 'en', mediaDevices: { getUserMedia: () => Promise.reject(new Error('no mic')) } },
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    // Движки уровней стартуют по-разному: B2 на первом же экране зовёт
    // window.scrollTo, кто-то — matchMedia или getComputedStyle. Каждая такая
    // дырка роняет чтение курса целиком, поэтому браузерные мелочи заглушены
    // списком, а не «по факту падения».
    scrollTo: () => {},
    scrollBy: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    addEventListener: () => {},
    removeEventListener: () => {},
    alert: () => {},
    URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
    MediaRecorder: function MediaRecorder() {
      return { start: () => {}, stop: () => {}, addEventListener: () => {} }
    },
    SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {},
    console: { log() {}, warn() {}, error() {} },
    __out: {},
  }
  sandbox.window = sandbox
  const ctx = vm.createContext(sandbox)
  const epilogue = `\n;(function(){${EXPORTS.map((n) => `try{__out.${n}=${n}}catch(e){}`).join(';')}})();`
  for (const [i, code] of courseScripts(html).entries()) {
    try {
      vm.runInContext(code + epilogue, ctx, { filename: `${file}#${i}`, timeout: 300000 })
    } catch (err) {
      // Молча пропустить нельзя: без LESSONS дальше поедет пустой курс.
      throw new Error(`курс ${file}: скрипт ${i} не выполнился: ${err.message}`, { cause: err })
    }
  }
  return { out: sandbox.__out, audioTags }
}

/**
 * base64 из значения клипа: у разных уровней это data URI или голая строка.
 * minLen отсекает случайные строки, когда мы перебираем весь банк подряд:
 * у тега text/plain источник известен, и длина там не важна.
 */
function clipBase64(value, minLen = 0) {
  const raw = String(value == null ? '' : value).trim()
  const m = /^data:audio\/[a-z0-9.+-]+;base64,(.+)$/s.exec(raw)
  if (m) return m[1]
  return /^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > minLen ? raw.replace(/\s+/g, '') : null
}

/**
 * Ключ клипа → base64. Способов хранения у уровней четыре, и знать о них
 * должен только этот модуль:
 *   A0/A2  — const BLOBS (хэш → data URI) + BANKS[урок][ключ] = хэш
 *   A1     — <script type="text/plain" id="a_<ключ>">base64</script>
 *   B1     — var BANK1…BANK12 (по банку на юнит), урок несёт ссылку на свой
 *   B2     — var AUDIO, заполняемый ниже по файлу
 * Ключ клипа уникален внутри урока, а не на весь уровень, поэтому в словаре
 * он записывается как «урок:ключ» — иначе клипы разных уроков затирают друг
 * друга. Голый ключ пишем тоже: у B1/B2 задания ссылаются на общий банк.
 */
function collectAudio(out, audioTags, lessons) {
  const audio = {}
  const put = (key, value, minLen = 64) => {
    const b64 = clipBase64(value, minLen)
    if (b64) audio[key] = b64
  }

  for (const [id, b64] of Object.entries(audioTags)) {
    if (id.startsWith('a_')) put(id.slice(2), b64, 0)
  }

  const blobs = out.BLOBS || {}
  for (const [lessonNo, bank] of Object.entries(out.BANKS || {})) {
    for (const [key, hash] of Object.entries(bank)) put(`${lessonNo}:${key}`, blobs[hash])
  }

  // Плоские банки уровня: AUDIO (B2) и BANK1…BANK12 (B1, по юниту).
  for (const [name, value] of Object.entries(out)) {
    if (!/^(AUDIO|BANK\d+)$/.test(name) || !value || typeof value !== 'object') continue
    for (const [key, clip] of Object.entries(value)) put(key, clip)
  }

  // Банк, привязанный к самому уроку (B1 отдаёт его вместе с уроком).
  for (const lesson of lessons || []) {
    for (const [key, clip] of Object.entries(lesson.bank || {})) put(`${lesson.key}:${key}`, clip)
  }
  return audio
}

/**
 * Читает курс.
 * @returns {{level:string, menu:object, lessons:Array, tests:Array, audio:object, perItem:object}}
 */
function readSelfStudyCourse(file) {
  const html = fs.readFileSync(file, 'utf8')
  const level = readLevel(html, file)
  const { out, audioTags } = runCourse(html, file)
  const raw = out.LESSONS
  if (!raw) throw new Error(`курс ${file}: объявление LESSONS не найдено`)

  const menu = out.MENU || out.MENU_DATA || {}
  const titles = new Map()
  for (const l of menu.lessons || []) titles.set(String(l.n), l.title || (l.t && (l.t.en || l.t)) || '')
  const blurbs = new Map()
  for (const l of menu.lessons || []) blurbs.set(String(l.n), l.blurb || l.goal || '')

  // Юниты: у A0 они в MENU.units, у A1/A2 — в MENU.chapters. Тест юнита A0
  // объявлен номером урока (test:101), у A2 — идентификатором ревью (r1).
  const units = (menu.units || menu.chapters || []).map((u, i) => ({
    no: u.n || i + 1,
    title: (u.t && (u.t.en || u.t)) || u.title || '',
    from: u.from,
    to: u.to,
    test: u.test != null ? String(u.test) : u.review != null ? String(u.review) : null,
  }))

  // Большие тесты уровня объявлены в каталоге отдельным списком: у B2 это
  // MENU.tests (четыре блочных и финальный, каждый со своим «after»).
  const exams = new Map()
  for (const t of menu.tests || []) {
    exams.set(String(t.n != null ? t.n : t.id), {
      id: t.id || `t${t.n}`,
      title: t.title || '',
      blurb: t.goal || t.lead || '',
      from: t.from,
      to: t.to,
      after: t.after,
      final: !!t.final,
    })
  }

  const testKeys = new Set(units.map((u) => u.test).filter(Boolean))
  const entryOf = (key, source) => {
    const l = source || {}
    const unit = units.find((u) => (testKeys.has(key) ? u.test === key : Number(key) >= u.from && Number(key) <= u.to))
    return {
      key,
      no: l.no != null ? l.no : Number(key),
      unit: unit ? unit.no : null,
      title: l.title || titles.get(key) || '',
      blurb: blurbs.get(key) || '',
      groups: l.groups || [],
      // Клипы урока: у A0/A2 они лежат в BANK[урок], у A1 — общие на уровень,
      // у B1 урок несёт банк своего юнита прямо в объекте.
      bank: l.bank && typeof l.bank === 'object' ? l.bank : (out.BANKS || {})[key] || {},
      // Тексты для чтения B1 лежат при уроке и адресуются по имени
      // ({t:"read", text:"t1"}), поэтому едут вместе с ним.
      texts: l.texts && typeof l.texts === 'object' ? l.texts : {},
    }
  }

  const lessons = []
  const tests = []
  for (const key of Object.keys(raw)) {
    const entry = entryOf(key, raw[key])
    const exam = exams.get(key)
    if (exam) {
      // Тест уровня, а не юнита: у него свой узел тропы (X<id>) и свой охват.
      tests.push({ ...entry, exam, title: entry.title || exam.title, blurb: exam.blurb })
    } else if (testKeys.has(key)) {
      tests.push(entry)
    } else {
      lessons.push(entry)
    }
  }

  // Ревью-тесты юнитов B1 живут не в LESSONS, а в своём объявлении TESTS[юнит]:
  // {title, lead, body, ins, items, pass}. Экраны теста собираются из items —
  // тем же движком, что и урок, поэтому дальше по конвейеру они идут как урок.
  for (const [unitKey, t] of Object.entries(out.TESTS || {})) {
    if (!t) continue
    const items = Array.isArray(t.items) ? t.items : []
    tests.push({
      key: `T${unitKey}`,
      no: Number(unitKey),
      unit: Number(unitKey),
      title: (t.title && (t.title.en || t.title)) || `Test ${unitKey}`,
      blurb: (t.lead && (t.lead.en || t.lead)) || '',
      // Задания теста лежат плоским списком: заворачиваем каждое в группу,
      // чтобы дальше их разбирал общий flattenGroups. Инструкция у задания
      // своя далеко не всегда — движок берёт её из общей таблицы теста
      // (T.ins[тип]), и без этого 156 экранов тестов B1 остались бы без
      // единой строки задания.
      groups: items
        .map((it) =>
          it && it.t
            ? {
                ...it,
                stage: it.stage || 'test',
                ins: it.ins || (t.ins && t.ins[it.t]) || null,
                items: it.items || [it],
              }
            : null,
        )
        .filter(Boolean),
      rawItems: items,
      pass: t.pass || null,
      bank: {},
    })
  }
  lessons.sort((a, b) => a.no - b.no)

  return {
    level,
    menu,
    units,
    lessons,
    tests,
    audio: collectAudio(out, audioTags, [...lessons, ...tests]),
    perItem: out.PER_ITEM || {},
    stages: out.STAGES || [],
  }
}

module.exports = { readSelfStudyCourse, courseScripts, inlineAudioTags, readLevel }
