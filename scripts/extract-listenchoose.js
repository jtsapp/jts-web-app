// Извлекает данные раздела «Слушай и выбирай» из data/jtslistenchoose.html —
// закоммиченного прототипа «Listen & Choose» (source of truth): 13 сцен по
// четыре фото, 150 заданий (по 50 на сложность) и 104 картинки.
//
// Запуск: node scripts/extract-listenchoose.js [--src <путь к html>]
//
// Пишет:
//   public/practice/listenchoose/questions.json — сцены (id + 4 подписи фото) и
//       задания (id, scene, level, answer, text, key, audio)
//   public/practice/listenchoose/img/<сцена>-<n>-<320|512>.webp — картинки как
//       есть (base64 → файл); имена те, что прототип ждёт от внешних файлов
//   scripts/listenchoose-i18n-source.json — ru/en/kk строки прототипа: источник
//       ручного порта ключей в src/i18n.jsx, в рантайм НЕ подключается
//   src/practice/listenchoose/__fixtures__/oracle.json — прогон ПРОТОТИПНЫХ
//       sampleQuestions и класса ListeningPlayer: оракул, с которым сверяется
//       порт. Дрейф порта = красный тест.
//
// Записей в прототипе нет (JTS_MEDIA.audio пуст, он читает описания браузерным
// синтезом), поэтому поле audio — это ИМЯ будущего файла по хэшу текста; сами
// mp3 делает scripts/make-listenchoose-audio.js.
//
// ── Почему скрипты узнаются по содержимому, а не по номеру ───────────────
// Прототип — пять <script> подряд: данные, картинки (одна строка на 3 МБ),
// плеер, выборка и приложение-IIFE. Номера сдвинет первый же ре-экспорт
// макета, а по содержимому сдвиг ловится сразу и с понятным сообщением.
//
// ── Почему оракул исполняет код самого прототипа ─────────────────────────
// Данные и функции выборки чистые, а класс плеера DOM не трогает (audio ему
// передают снаружи), поэтому хватает node:vm с подставными performance и
// audio. Ожидания считает ПРОТОТИП, а не мы: порт, который «исправил»
// странность оригинала, сразу краснеет.
//
// node:vm — не песочница: скрипт исполняет код html-файла. Источник — только
// закоммиченный прототип из репозитория (data/jtslistenchoose.html), чужой
// файл в `--src` подсовывать нельзя.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { sliceConst, sliceFunction } = require('./lib/js-slice.js')
const { sayAudioFile } = require('./jts-self/say-audio.js')

const ROOT = path.join(__dirname, '..')
const DEFAULT_SRC = path.join(ROOT, 'data', 'jtslistenchoose.html')
const OUT_DIR = path.join(ROOT, 'public', 'practice', 'listenchoose')
const IMG_DIR = path.join(OUT_DIR, 'img')
const FIXTURES_DIR = path.join(ROOT, 'src', 'practice', 'listenchoose', '__fixtures__')
const I18N_SOURCE = path.join(__dirname, 'listenchoose-i18n-source.json')
const AUDIO_URL_BASE = '/practice/listenchoose/audio'

const LEVELS = ['easy', 'medium', 'hard']
const SIZES = [320, 512]
// Ожидаемый состав. Прототип может дополниться, но молча потерять половину
// материала он не должен.
const EXPECT_SCENES = 13
const EXPECT_PER_LEVEL = 50

function fail(msg) {
  throw new Error('[extract-listenchoose] ' + msg)
}

const round3 = (n) => Math.round(n * 1000) / 1000

// ── Срезы прототипа ──────────────────────────────────────────────────────
function scriptBodies(html) {
  const bodies = []
  const re = /<script>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) bodies.push(m[1])
  return bodies
}

function pickScripts(html) {
  const bodies = scriptBodies(html)
  const find = (label, has) => {
    const found = bodies.filter(has)
    if (found.length !== 1) fail(`не найден (или найден не один) скрипт «${label}» — структура прототипа изменилась`)
    return found[0]
  }
  return {
    data: find('данные', (b) => b.includes('const SCENES') && b.includes('const QUESTIONS')),
    media: find('картинки', (b) => b.startsWith('window.JTS_MEDIA=')),
    player: find('плеер', (b) => b.includes('class ListeningPlayer')),
    sampling: find('выборка', (b) => b.includes('function sampleQuestions')),
    app: find('приложение', (b) => b.includes('const I={') && b.includes('const STORE=')),
  }
}

// Данные прототипа исполняются им самим: id заданий, фильтр сцены art и key
// получаются ровно такими, какие он показывает, и ничего не пересчитывается.
function evalData(dataBody) {
  const ctx = vm.createContext({})
  const out = vm.runInContext(`${dataBody}\n;({ SCENES, QUESTIONS, LEVELS })`, ctx, { timeout: 20000 })
  // Через JSON: объекты из чужого контекста vm иначе ведут себя странно в
  // instanceof и toEqual.
  return JSON.parse(JSON.stringify(out))
}

function checkData({ scenes, questions, levels }) {
  if (JSON.stringify(levels) !== JSON.stringify(LEVELS)) fail(`уровни ${JSON.stringify(levels)}, ожидались ${LEVELS.join('/')}`)
  if (scenes.length !== EXPECT_SCENES) fail(`сцен ${scenes.length}, ожидалось ${EXPECT_SCENES}`)
  const sceneIds = new Set()
  for (const s of scenes) {
    // id сцены становится частью имени файла картинки: слэш или точки увели бы
    // запись за пределы папки img.
    if (!/^[a-z0-9-]+$/.test(s.id)) fail(`сцена «${s.id}»: id идёт в имя файла, допустимы только a–z, 0–9 и «-»`)
    if (sceneIds.has(s.id)) fail(`сцена «${s.id}»: дубль`)
    sceneIds.add(s.id)
    if (!Array.isArray(s.options) || s.options.length !== 4 || s.options.some((o) => !o || typeof o !== 'string')) {
      fail(`сцена «${s.id}»: нужно ровно четыре подписи фото`)
    }
  }
  const ids = new Set()
  for (const q of questions) {
    const where = `задание «${q.id || '?'}»`
    if (!q.id || ids.has(q.id)) fail(`${where}: нет id или дубль`)
    ids.add(q.id)
    if (!sceneIds.has(q.scene)) fail(`${where}: сцена «${q.scene}» неизвестна`)
    if (!LEVELS.includes(q.level)) fail(`${where}: сложность «${q.level}» неизвестна`)
    if (![0, 1, 2, 3].includes(q.answer)) fail(`${where}: answer ${q.answer} вне 0–3`)
    if (typeof q.text !== 'string' || !q.text.trim()) fail(`${where}: пустой текст`)
    if (typeof q.key !== 'string' || !q.key.trim()) fail(`${where}: пустой key`)
  }
  for (const level of LEVELS) {
    const n = questions.filter((q) => q.level === level).length
    if (n !== EXPECT_PER_LEVEL) fail(`на сложности ${level} ${n} заданий, ожидалось ${EXPECT_PER_LEVEL}`)
  }
}

// ── Картинки ─────────────────────────────────────────────────────────────
function decodeWebp(key, dataUri) {
  const m = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(dataUri)
  if (!m) fail(`картинка «${key}»: ожидался data:image/webp;base64`)
  const buf = Buffer.from(m[1], 'base64')
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') fail(`картинка «${key}»: не RIFF/WEBP`)
  return buf
}

function readImages(mediaBody, scenes) {
  const marker = 'window.JTS_MEDIA='
  let json = mediaBody.slice(marker.length).trim()
  if (json.endsWith(';')) json = json.slice(0, -1)
  let media
  try {
    media = JSON.parse(json)
  } catch (e) {
    fail('JTS_MEDIA не разобрался как JSON: ' + e.message)
  }
  if (!media || typeof media.images !== 'object') fail('в JTS_MEDIA нет images')
  // Записи в файле — повод задуматься, а не молча проигнорировать: тогда порт
  // озвучивал бы иначе, чем задумал автор прототипа.
  if (media.audio && Object.keys(media.audio).length) {
    console.warn('[extract-listenchoose] в прототипе появились записи JTS_MEDIA.audio — порт их не использует')
  }
  const expected = []
  for (const s of scenes) for (let i = 0; i < 4; i++) for (const size of SIZES) expected.push(`${s.id}-${i}-${size}`)
  for (const key of expected) if (!(key in media.images)) fail(`нет картинки «${key}» — прототип изменил состав`)
  const extra = Object.keys(media.images).filter((k) => !expected.includes(k))
  if (extra.length) fail(`лишние картинки: ${extra.slice(0, 3).join(', ')} — прототип изменил состав`)
  const images = {}
  for (const key of expected) images[key] = decodeWebp(key, media.images[key])
  return images
}

// ── Словарь интерфейса ───────────────────────────────────────────────────
// Объявление `const I={…}` плюс строки `Object.assign(I.<язык>,{…})`, которые
// прототип дописал позже (набор заданий); они однострочные.
function readDictionary(appBody) {
  const decl = sliceConst(appBody, 'I')
  const extras = appBody.split('\n').filter((l) => l.startsWith('Object.assign(I.'))
  const ctx = vm.createContext({})
  const dict = vm.runInContext(`${decl}\n${extras.join('\n')}\n;I`, ctx, { timeout: 5000 })
  for (const lang of ['ru', 'en', 'kz']) if (!dict[lang] || !dict[lang].subtitle) fail(`в словаре нет языка ${lang}`)
  // В прототипе казахский — `kz`, в приложении — `kk` (как у остальных разделов).
  return { ru: { ...dict.ru }, en: { ...dict.en }, kk: { ...dict.kz } }
}

// ── Разбор прототипа целиком ─────────────────────────────────────────────
function readPrototype(html) {
  const bodies = pickScripts(html)
  const data = evalData(bodies.data)
  const scenes = data.SCENES.map((s) => ({ id: s.id, options: s.options }))
  const questions = data.QUESTIONS.map((q) => ({
    id: q.id,
    scene: q.scene,
    level: q.level,
    answer: q.answer,
    text: q.text,
    key: q.key,
    // Имя записи — хэш текста (как у озвучки уроков): правка описания
    // перегенерирует ровно одну запись, а не сдвигает нумерацию.
    audio: `${AUDIO_URL_BASE}/${sayAudioFile(q.text)}`,
  }))
  checkData({ scenes, questions, levels: data.LEVELS })
  return {
    bodies,
    scenes,
    questions,
    levels: data.LEVELS,
    images: readImages(bodies.media, scenes),
    i18n: readDictionary(bodies.app),
  }
}

// ── Оракул ───────────────────────────────────────────────────────────────
// mulberry32 — единственный ГСЧ, который знают и экстрактор, и тест порта.
// Совпадение проверяется по rngProbe: разъехавшиеся генераторы дали бы не
// «порт сломан», а невнятную разницу очередей.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COUNTS = [1, 5, 10, 20, 50]
const SEEN_MODES = ['none', 'half', 'all']
const PREVIOUS_SCENES = [null, 'bus', 'art']

function sampleOracle(bodies, questions) {
  const ctx = vm.createContext({})
  vm.runInContext(sliceFunction(bodies.sampling, 'sampleQuestions'), ctx, { timeout: 20000 })
  const sample = vm.runInContext('sampleQuestions', ctx)
  const cases = []
  let seed = 0
  const run = (level, count, seen, previousScene) => {
    seed++
    let result
    try {
      const r = sample(questions, { level, count, seen, previousScene }, mulberry32(seed))
      result = { queue: [...r.queue], seen: [...r.seen] }
    } catch (e) {
      result = { throws: e.name }
    }
    cases.push({ level, count, previousScene, seed, seen, result })
  }
  for (const level of LEVELS) {
    const pool = questions.filter((q) => q.level === level).map((q) => q.id)
    for (const count of COUNTS) {
      for (const mode of SEEN_MODES) {
        const seen = mode === 'none' ? [] : mode === 'half' ? pool.filter((_, i) => i % 2 === 0) : pool
        for (const previousScene of PREVIOUS_SCENES) run(level, count, seen, previousScene)
      }
    }
  }
  // Плохие размеры набора: нулевой, дробный и больше банка.
  for (const count of [0, 1.5, 51]) run('easy', count, [], null)
  return cases
}

// Фейковый HTMLAudioElement: ровно то, что читает и пишет плеер прототипа.
// События не приходят сами — их подаёт трасса, как это делает браузер.
function makeFakeAudio() {
  const listeners = {}
  const audio = {
    currentTime: 0,
    duration: NaN,
    paused: true,
    ended: false,
    seeking: false,
    muted: false,
    volume: 1,
    playbackRate: 1,
    readyState: 0,
    src: '',
    addEventListener(type, fn) {
      ;(listeners[type] = listeners[type] || []).push(fn)
    },
    removeAttribute() {},
    load() {},
    pause() {
      this.paused = true
    },
    play() {
      this.paused = false
      this.ended = false
      return Promise.resolve()
    },
  }
  return { audio, listeners }
}

// Трассы: шаг = { at (мс на стене), audio (что выставить в audio), ev (какое
// событие подать), call (какой метод плеера дёрнуть), args }. Порядок внутри
// шага: свойства → событие → вызов.
function playSpan({ from, to, startWall, rate = 1, tickMs = 250 }) {
  const steps = []
  const total = ((to - from) / rate) * 1000
  let elapsed = 0
  while (elapsed < total) {
    elapsed = Math.min(total, elapsed + tickMs)
    steps.push({ at: startWall + elapsed, audio: { currentTime: round3(from + (elapsed / 1000) * rate) }, ev: 'timeupdate' })
  }
  return { steps, endWall: startWall + total }
}

// Браузер по концу записи присылает pause, а следом ended.
function finish(at, currentTime) {
  return [
    { at, audio: { paused: true, currentTime }, ev: 'pause' },
    { at: at + 5, audio: { ended: true, paused: true, currentTime }, ev: 'ended' },
  ]
}

const start = (duration) => [
  { at: 0, audio: { duration, readyState: 4 }, ev: 'loadedmetadata' },
  { at: 100, call: 'play' },
  { at: 110, audio: { currentTime: 0 }, ev: 'playing' },
]

function buildTraces() {
  const D = 6
  const traces = []
  const add = (name, steps) => traces.push({ name, duration: D, steps })

  {
    const s = playSpan({ from: 0, to: D, startWall: 110 })
    add('full-listen', [...start(D), ...s.steps, ...finish(s.endWall, D)])
  }
  {
    const a = playSpan({ from: 0, to: 2, startWall: 110 })
    const b = playSpan({ from: 5.5, to: D, startWall: a.endWall + 10 })
    add('seek-skip', [
      ...start(D),
      ...a.steps,
      { at: a.endWall, audio: { seeking: true }, ev: 'seeking' },
      { at: a.endWall + 10, audio: { currentTime: 5.5, seeking: false }, ev: 'seeked' },
      ...b.steps,
      ...finish(b.endWall, D),
    ])
  }
  {
    const a = playSpan({ from: 0, to: 4, startWall: 110 })
    const b = playSpan({ from: 0, to: D, startWall: a.endWall + 15 })
    add('seek-back-replay', [
      ...start(D),
      ...a.steps,
      { at: a.endWall, call: 'seek', args: [0] },
      { at: a.endWall + 5, audio: { seeking: true }, ev: 'seeking' },
      { at: a.endWall + 15, audio: { seeking: false }, ev: 'seeked' },
      ...b.steps,
      ...finish(b.endWall, D),
    ])
  }
  {
    const a = playSpan({ from: 0, to: 2, startWall: 110 })
    const b = playSpan({ from: 2, to: D, startWall: a.endWall + 5020 })
    add('pause-resume', [
      ...start(D),
      ...a.steps,
      { at: a.endWall + 10, audio: { paused: true, currentTime: 2 }, ev: 'pause' },
      { at: a.endWall + 5010, call: 'play' },
      { at: a.endWall + 5020, audio: { currentTime: 2 }, ev: 'playing' },
      ...b.steps,
      ...finish(b.endWall, D),
    ])
  }
  {
    const a = playSpan({ from: 0, to: 3, startWall: 110 })
    const b = playSpan({ from: 3, to: D, startWall: a.endWall })
    add('mute-midway', [
      ...start(D),
      ...a.steps,
      { at: a.endWall, audio: { currentTime: 3 }, call: 'setVolume', args: [0] },
      ...b.steps,
      ...finish(b.endWall, D),
    ])
  }
  {
    const s = playSpan({ from: 0, to: D, startWall: 110, rate: 1.25 })
    add('rate-125', [
      { at: 0, audio: { duration: D, readyState: 4 }, ev: 'loadedmetadata' },
      { at: 50, call: 'setRate', args: [1.25] },
      { at: 100, call: 'play' },
      { at: 110, audio: { currentTime: 0 }, ev: 'playing' },
      ...s.steps,
      ...finish(s.endWall, D),
    ])
  }
  {
    const a = playSpan({ from: 0, to: 2, startWall: 110 })
    // Скачок на три секунды за полсекунды без события seeking: залипание, а не
    // прослушивание.
    const b = playSpan({ from: 5, to: D, startWall: a.endWall + 500 })
    add('stutter-jump', [
      ...start(D),
      ...a.steps,
      { at: a.endWall + 500, audio: { currentTime: 5 }, ev: 'timeupdate' },
      ...b.steps,
      ...finish(b.endWall, D),
    ])
  }
  {
    const s = playSpan({ from: 0, to: 5.7, startWall: 110 })
    add('tail-ok', [...start(D), ...s.steps, ...finish(s.endWall, 5.7)])
  }
  {
    const s = playSpan({ from: 0, to: 5.6, startWall: 110 })
    add('tail-short', [...start(D), ...s.steps, ...finish(s.endWall, 5.6)])
  }
  {
    const a = playSpan({ from: 0, to: D, startWall: 110 })
    const at = a.endWall + 5 + 100
    const b = playSpan({ from: 0, to: D, startWall: at + 210 })
    add('reset-after-wrong', [
      ...start(D),
      ...a.steps,
      ...finish(a.endWall, D),
      { at, call: 'resetListening' },
      { at: at + 100, call: 'replay' },
      { at: at + 210, audio: { currentTime: 0 }, ev: 'playing' },
      ...b.steps,
      ...finish(b.endWall, D),
    ])
  }
  return traces
}

function runPrototypeTrace(playerBody, trace) {
  let clock = 0
  const ctx = vm.createContext({
    performance: { now: () => clock },
    window: {},
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    console,
  })
  vm.runInContext(`${playerBody}\nglobalThis.ListeningPlayer = ListeningPlayer`, ctx, { timeout: 5000 })
  const { audio, listeners } = makeFakeAudio()
  let heard = 0
  const player = new ctx.ListeningPlayer(audio, () => {}, () => heard++)
  player.load({ audio: 'a.mp3', text: 'x' })
  for (const step of trace.steps) {
    clock = step.at
    if (step.audio) Object.assign(audio, step.audio)
    if (step.ev) for (const fn of listeners[step.ev] || []) fn({})
    if (step.call) player[step.call](...(step.args || []))
  }
  return {
    ranges: player.ranges.map((r) => r.map(round3)),
    coverage: round3(player.coverage()),
    heard,
  }
}

function playerOracle(bodies) {
  return buildTraces().map((trace) => ({ ...trace, expect: runPrototypeTrace(bodies.player, trace) }))
}

function buildOracle(html) {
  const proto = readPrototype(html)
  const rng = mulberry32(1)
  return {
    rngProbe: [rng(), rng(), rng(), rng(), rng()],
    sampling: sampleOracle(proto.bodies, evalData(proto.bodies.data).QUESTIONS),
    player: playerOracle(proto.bodies),
  }
}

// ── Запись ───────────────────────────────────────────────────────────────
// Одинаковое содержимое не перезаписываем: прогон экстрактора «впустую» не
// должен шуметь в git status и дёргать mtime 104 картинок.
function writeIfChanged(file, data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
  if (fs.existsSync(file) && fs.readFileSync(file).equals(buf)) return false
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, buf)
  return true
}

// Одно задание — одна строка: правка описания в прототипе даёт в git diff одну
// строку, а не километр минифицированного JSON.
function formatQuestions({ levels, scenes, questions }) {
  const j = JSON.stringify
  return (
    '{\n' +
    ` "levels": ${j(levels)},\n` +
    ` "scenes": [\n${scenes.map((s) => '  ' + j(s)).join(',\n')}\n ],\n` +
    ` "questions": [\n${questions.map((q) => '  ' + j(q)).join(',\n')}\n ]\n` +
    '}\n'
  )
}

function extract({ src = DEFAULT_SRC, write = true } = {}) {
  if (!fs.existsSync(src)) fail(`нет исходника ${src}`)
  const html = fs.readFileSync(src, 'utf8')
  const proto = readPrototype(html)
  const oracle = buildOracle(html)
  const changed = []
  if (write) {
    const put = (file, data) => {
      if (writeIfChanged(file, data)) changed.push(path.relative(ROOT, file).split(path.sep).join('/'))
    }
    put(path.join(OUT_DIR, 'questions.json'), formatQuestions(proto))
    for (const [key, buf] of Object.entries(proto.images)) put(path.join(IMG_DIR, `${key}.webp`), buf)
    put(I18N_SOURCE, JSON.stringify(proto.i18n, null, 1) + '\n')
    put(path.join(FIXTURES_DIR, 'oracle.json'), JSON.stringify(oracle) + '\n')
  }
  return { proto, oracle, changed }
}

if (require.main === module) {
  const i = process.argv.indexOf('--src')
  const src = i > 0 ? path.resolve(process.argv[i + 1]) : DEFAULT_SRC
  const { proto, oracle, changed } = extract({ src })
  console.log(
    `сцен ${proto.scenes.length}, заданий ${proto.questions.length}, картинок ${Object.keys(proto.images).length}, ` +
      `случаев выборки ${oracle.sampling.length}, трасс плеера ${oracle.player.length}`,
  )
  console.log(changed.length ? `записано файлов: ${changed.length}` : 'без изменений')
  for (const f of changed.filter((f) => !f.endsWith('.webp'))) console.log('  ' + f)
}

module.exports = {
  DEFAULT_SRC,
  LEVELS,
  checkData,
  SIZES,
  buildOracle,
  buildTraces,
  extract,
  mulberry32,
  pickScripts,
  readPrototype,
  scriptBodies,
}
