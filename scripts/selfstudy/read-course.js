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
const EXPORTS = ['MENU', 'LESSONS', 'BLOBS', 'BANKS', 'PER_ITEM', 'STAGES', 'TOTAL_LESSONS']

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
    navigator: { language: 'en' },
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => 0,
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

/** Ключ клипа → base64 mp3. Собирает оба способа хранения в один словарь. */
function collectAudio(out, audioTags) {
  const audio = {}
  for (const [id, b64] of Object.entries(audioTags)) {
    if (id.startsWith('a_')) audio[id.slice(2)] = b64
  }
  const blobs = out.BLOBS || {}
  for (const [lessonNo, bank] of Object.entries(out.BANKS || {})) {
    for (const [key, hash] of Object.entries(bank)) {
      const uri = blobs[hash]
      if (!uri) continue
      const m = /^data:audio\/[a-z0-9]+;base64,(.+)$/s.exec(String(uri))
      if (!m) continue
      // Ключ клипа уникален внутри урока, а не на весь уровень: в A0 у каждого
      // урока свой BANK. Полное имя ключа делаем «урок:ключ», иначе клипы
      // разных уроков затирают друг друга.
      audio[`${lessonNo}:${key}`] = m[1]
    }
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

  const menu = out.MENU || {}
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

  const testKeys = new Set(units.map((u) => u.test).filter(Boolean))
  const lessons = []
  const tests = []
  for (const key of Object.keys(raw)) {
    const l = raw[key] || {}
    const unit = units.find((u) => (testKeys.has(key) ? u.test === key : Number(key) >= u.from && Number(key) <= u.to))
    const entry = {
      key,
      no: l.no != null ? l.no : Number(key),
      unit: unit ? unit.no : null,
      title: l.title || titles.get(key) || '',
      blurb: blurbs.get(key) || '',
      groups: l.groups || [],
      // Клипы урока: у A0/A2 они лежат в BANK[урок], у A1 — общие на уровень.
      bankKeys: Object.keys(l.bank || (out.BANKS || {})[key] || {}),
    }
    if (testKeys.has(key)) tests.push(entry)
    else lessons.push(entry)
  }
  lessons.sort((a, b) => a.no - b.no)

  return {
    level,
    menu,
    units,
    lessons,
    tests,
    audio: collectAudio(out, audioTags),
    perItem: out.PER_ITEM || {},
    stages: out.STAGES || [],
  }
}

module.exports = { readSelfStudyCourse, courseScripts, inlineAudioTags, readLevel }
