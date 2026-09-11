// Извлекает данные раздела «Слова в картинках» из data/jtswords.html —
// закоммиченного прототипа (source of truth): 564 слова в пяти секциях и 52
// сцены с типизированными слотами.
//
// Запуск: node scripts/extract-words.js [--src <путь к html>]
//
// Пишет:
//   public/practice/words/meta.json        — секции и сцены для каталога
//   public/practice/words/<section>.json   — слова и сцены секции, грузится лениво
//   src/practice/words/__fixtures__/oracle-<section>.json — прогон ПРОТОТИПНЫХ
//       poolFor/buildSession/placeRound: оракул, с которым сверяется порт
//       движка. Дрейф порта = красный тест.
//
// ── Почему целиком в node:vm, а не резка по константам ────────────────────
// В «Чтении» данные лежали отдельным <script> без DOM, и хватало одного среза.
// Здесь данные и движок в ОДНОМ скрипте, а нужные значения размазаны по
// пятнадцати константам, часть которых объявлена через запятую
// (`const MIN_W=9, SAFE={…}`) — резать каждую отдельно значит держать
// пятнадцать швов, которые сдвинет первый же ре-экспорт.
// Поэтому исполняем ВЕСЬ скрипт под заглушкой DOM, отрезав только последнюю
// строку — бутстрап, который рисует главный экран. Побочный эффект приятный:
// оракулу достаются настоящие прототипные функции, а не их копии.

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const ROOT = path.join(__dirname, '..')
const DEFAULT_SRC = path.join(ROOT, 'data', 'jtswords.html')
const OUT_DIR = path.join(ROOT, 'public', 'practice', 'words')
const FIXTURES_DIR = path.join(ROOT, 'src', 'practice', 'words', '__fixtures__')

const SECTION_IDS = ['animals', 'food', 'clothes', 'house', 'body']
// Ожидаемый состав. Прототип может дополниться, но молча потерять половину
// материала он не должен — поэтому нижние границы, а не «сколько получилось».
const MIN_WORDS = 500
const MIN_SCENES = 50
// Типы слотов и размещения: g земля · b ветка · w вода · f воздух.
const PLACEMENTS = ['g', 'b', 'w', 'f']
// Сид и ориентация оракула. Ландшафт, потому что раскладку в портрете
// отличает только число слов в раунде и множитель размера — их проверяют
// отдельные тесты движка, а координаты фиксируем в одной системе.
const ORACLE_SEED = 1
const ORACLE_PORTRAIT = false

function fail(msg) {
  throw new Error('[extract-words] ' + msg)
}

// ── Срез прототипа ───────────────────────────────────────────────────────
// Последняя строка скрипта — бутстрап: `if(location.hash==='#audio')
// renderAudioAudit(); else renderHome();`. Всё, что до неё, — объявления,
// которые можно безопасно исполнить под заглушкой.
const BOOTSTRAP = "if(location.hash==='#audio') renderAudioAudit(); else renderHome();"

function sliceScript(html) {
  const open = html.indexOf('<script>')
  if (open < 0) fail('не найден <script> в прототипе')
  const close = html.indexOf('</script>', open)
  if (close < 0) fail('<script> не закрыт')
  const body = html.slice(open + '<script>'.length, close)

  const at = body.indexOf(BOOTSTRAP)
  if (at < 0) fail('не найден бутстрап прототипа — структура изменилась')
  for (const mark of ['const ENVS', 'const ANIMALS', 'const SECTIONS', 'const HOSTED', 'function placeRound']) {
    if (!body.includes(mark)) fail(`в скрипте нет ${mark} — структура прототипа изменилась`)
  }
  return body.slice(0, at)
}

// ── Заглушка DOM ─────────────────────────────────────────────────────────
// Ровно столько, сколько трогает прототип при загрузке и в чистых функциях
// раскладки: класс `portrait` на #app (его читают syncPortrait, spriteScale и
// stageAR) и безобидные пустышки на всё остальное. Рендер мы не зовём, так что
// innerHTML и вставки узлов никуда не ведут.
function makeSandbox(state) {
  const classList = {
    contains: (c) => (c === 'portrait' ? state.portrait : false),
    add: () => {},
    remove: () => {},
    toggle: (c, on) => {
      if (c === 'portrait') state.portrait = !!on
    },
  }
  const node = {
    classList,
    dataset: {},
    style: {},
    set innerHTML(_v) {},
    get innerHTML() { return '' },
    appendChild: () => {},
    prepend: () => {},
    remove: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    setAttribute: () => {},
    getAttribute: () => null,
    hasAttribute: () => false,
    focus: () => {},
    blur: () => {},
  }
  const document = {
    body: node,
    activeElement: null,
    documentElement: node,
    querySelector: () => node,
    querySelectorAll: () => [],
    createElement: () => ({ ...node, classList, dataset: {}, style: {} }),
    addEventListener: () => {},
  }
  const store = new Map()
  const sandbox = {
    document,
    location: { hash: '' },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
    matchMedia: () => ({ matches: state.portrait, addEventListener: () => {} }),
    addEventListener: () => {},
    scrollTo: () => {},
    Image: function Image() { return { ...node } },
    Audio: function Audio() { return { ...node, play: () => Promise.resolve(), load: () => {}, pause: () => {} } },
    AudioContext: function AudioContext() { return { currentTime: 0, createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {}, frequency: { value: 0 } }) } },
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => 0,
    console,
  }
  sandbox.window = sandbox
  sandbox.globalThis = sandbox
  return sandbox
}

// Детерминированный ГПСЧ вместо Math.random. Прототип перемешивает пул и
// добавляет случайный разброс в оценку слота (`Math.random()*4` в placeRound) —
// без подмены оракул был бы разным на каждом прогоне.
// mulberry32: короткий, воспроизводимый, без зависимостей.
function makeRng(seed) {
  let a = seed >>> 0
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Играбельные слова: те, у которых есть отрисованная картинка. Прототип
 * фильтрует их сам (`hasArt` внутри `poolFor`) — без картинки слово нечем
 * показать на сцене. Сейчас таких два: donkey и clownfish.
 * Дальше по коду ходит ТОЛЬКО этот список: иначе в JSON уедут слова, за
 * которыми нет ни спрайта, ни (у donkey) записи.
 */
function playableWords({ ANIMALS, HOSTED }) {
  return ANIMALS.filter((w) => !!HOSTED.animals[w.id])
}

function readPrototype(html) {
  const state = { portrait: false }
  const sandbox = makeSandbox(state)
  const ctx = vm.createContext(sandbox)
  vm.runInContext(sliceScript(html), ctx, { timeout: 20000 })

  // Забирать значения приходится выражением ВНУТРИ контекста: объявленные
  // через const/let они живут в лексической области скрипта и на объекте
  // песочницы не появляются (ctx.CDN был бы undefined).
  const data = vm.runInContext(
    '({ENVS, ANIMALS, SECTIONS, HOSTED, CONFUSABLE, COMPAT, ROUND_SIZE, BASE, MIN_W, SAFE, CDN, AUDIO_BASE, AUDIO_ALIAS, cleanAudio, sizeOf2})',
    ctx,
  )
  return { ...data, ctx, state }
}

// ── Валидация ────────────────────────────────────────────────────────────
function checkScene(env, wordsByScene) {
  const where = `сцена ${env.id}`
  if (!env.id || !env.name || !env.place) fail(`${where}: битая шапка`)
  if (!SECTION_IDS.includes(env.section)) fail(`${where}: неизвестная секция «${env.section}»`)
  if (!Array.isArray(env.slots) || env.slots.length < 8) fail(`${where}: меньше восьми слотов`)
  for (const s of env.slots) {
    if (!Array.isArray(s) || s.length < 3) fail(`${where}: битый слот`)
    if (!PLACEMENTS.includes(s[2])) fail(`${where}: неизвестный тип слота «${s[2]}»`)
  }
  const pool = wordsByScene.get(env.id) || []
  if (!pool.length) fail(`${where}: пустой пул слов`)
  // Слов в сцене не должно быть больше, чем слотов: лишним просто негде встать,
  // и прототип их молча выбрасывал бы из раунда.
  const perRound = Math.min(pool.length, env.slots.length)
  if (perRound > env.slots.length) fail(`${where}: слов больше, чем слотов`)
}

function checkWord(w) {
  const where = `слово ${w.id || '???'}`
  if (!w.id || !w.word) fail(`${where}: битая шапка`)
  if (!w.ru || !w.kk) fail(`${where}: нет перевода ru/kk`)
  if (!PLACEMENTS.includes(w.pl)) fail(`${where}: неизвестный тип размещения «${w.pl}»`)
  if (!SECTION_IDS.includes(w.section)) fail(`${where}: неизвестная секция «${w.section}»`)
  if (!w.env) fail(`${where}: нет домашней сцены`)
}

// ── Оракул ───────────────────────────────────────────────────────────────
// Считают ПРОТОТИПНЫЕ функции. Math.random подменён сидом, ориентация задана —
// иначе фикстура была бы разной на каждом прогоне.
function buildOracle({ ctx, state }, envs) {
  state.portrait = ORACLE_PORTRAIT
  const scenes = {}
  for (const env of envs) {
    const rng = makeRng(ORACLE_SEED)
    ctx.Math = Object.create(Math)
    ctx.Math.random = rng
    const session = vm.runInContext('buildSession(__env)', Object.assign(ctx, { __env: env }))
    // placeRound читает сцену из глобального G — ставим его так же, как start().
    vm.runInContext('G = {env: __env, pool: [], rounds: [], r: 0, idx: 0, order: [], found: new Set(), foundAll: [], lock: false, tok: 0}', ctx)
    ctx.__round = session.rounds[0]
    const placed = vm.runInContext('placeRound(__round)', ctx)
    scenes[env.id] = {
      pool: session.pool.map((a) => a.id),
      rounds: session.rounds.map((r) => r.map((a) => a.id)),
      placed: placed.map((p) => ({
        id: p.a.id,
        x: round2(p.x),
        y: round2(p.y),
        w: round2(p.w),
        t: p.t,
      })),
    }
  }
  return { seed: ORACLE_SEED, portrait: ORACLE_PORTRAIT, scenes }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

// ── Основной проход ──────────────────────────────────────────────────────
function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data), 'utf8')
  return fs.statSync(file).size
}

function main() {
  const argSrc = process.argv.indexOf('--src')
  const src = argSrc > -1 ? process.argv[argSrc + 1] : DEFAULT_SRC
  const html = fs.readFileSync(src, 'utf8')

  const proto = readPrototype(html)
  const { ENVS, ANIMALS, SECTIONS, HOSTED, CONFUSABLE, sizeOf2 } = proto
  const words = playableWords(proto)
  const dropped = ANIMALS.length - words.length

  if (words.length < MIN_WORDS) fail(`играбельных слов ${words.length}, ожидалось не меньше ${MIN_WORDS}`)
  if (ENVS.length < MIN_SCENES) fail(`сцен ${ENVS.length}, ожидалось не меньше ${MIN_SCENES}`)
  if (SECTIONS.length !== SECTION_IDS.length) fail(`секций ${SECTIONS.length}, ожидалось ${SECTION_IDS.length}`)

  const ids = new Set()
  const wordsByScene = new Map()
  for (const w of words) {
    checkWord(w)
    // Задание — «услышь и найди»: слово без записи в нём беззвучно и
    // непроходимо. Лучше упасть здесь, чем выкатить немой раунд.
    if (!HOSTED.audio[w.id]) fail(`слово ${w.id}: есть картинка, но нет записи`)
    if (ids.has(w.id)) fail(`дубль id «${w.id}»`)
    ids.add(w.id)
    for (const scene of [w.env, w.also]) {
      if (!scene) continue
      if (!wordsByScene.has(scene)) wordsByScene.set(scene, [])
      wordsByScene.get(scene).push(w)
    }
  }
  for (const env of ENVS) checkScene(env, wordsByScene)
  // Сцена, на которую ссылается слово, обязана существовать — иначе слово
  // невидимо: в пул его никто не соберёт.
  const sceneIds = new Set(ENVS.map((e) => e.id))
  for (const scene of wordsByScene.keys()) {
    if (!sceneIds.has(scene)) fail(`слова ссылаются на несуществующую сцену «${scene}»`)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.mkdirSync(FIXTURES_DIR, { recursive: true })

  const meta = { sections: [] }
  for (const section of SECTIONS) {
    const envs = ENVS.filter((e) => e.section === section.id)
    const sectionWords = words.filter((w) => w.section === section.id)
    if (!envs.length || !sectionWords.length) fail(`секция ${section.id} пуста`)

    // Путаемые пары этой секции: разводить frog/toad по разным раундам умеет
    // движок, а какие именно пары путаются — данные, и живут они рядом с ними.
    const sectionIds = new Set(sectionWords.map((w) => w.id))
    const confusable = CONFUSABLE.filter(([a, b]) => sectionIds.has(a) && sectionIds.has(b))

    write(path.join(OUT_DIR, `${section.id}.json`), {
      section: section.id,
      confusable,
      scenes: envs.map((e) => ({
        id: e.id,
        name: e.name,
        place: e.place,
        tint: e.tint,
        tint2: e.tint2,
        water: !!e.water,
        slots: e.slots,
      })),
      words: sectionWords.map((w) => ({
        id: w.id,
        word: w.word,
        ru: w.ru,
        kk: w.kk,
        env: w.env,
        also: w.also || null,
        pl: w.pl,
        anim: w.anim,
        pri: w.pri,
        // Размерный класс считает прототип (sizeOf2 по восьми спискам id).
        // Кладём готовым: движку раскладки нужен только он, а тащить в порт
        // восемь списков — это восемь мест, где он разъедется с исходником.
        sz: sizeOf2(w),
        ...(w.cm ? { cm: w.cm } : {}),
      })),
    })

    write(path.join(FIXTURES_DIR, `oracle-${section.id}.json`), buildOracle(proto, envs))

    meta.sections.push({
      id: section.id,
      name: section.name,
      blurb: section.blurb,
      words: sectionWords.length,
      scenes: envs.map((e) => ({
        id: e.id,
        name: e.name,
        place: e.place,
        tint: e.tint,
        tint2: e.tint2,
        water: !!e.water,
        // Счётчик каталога — размер пула сцены, а не число «домашних» слов:
        // гости из соседней сцены тоже спрашиваются.
        count: (wordsByScene.get(e.id) || []).length,
      })),
    })
  }
  write(path.join(OUT_DIR, 'meta.json'), meta)

  const totalScenes = meta.sections.reduce((s, x) => s + x.scenes.length, 0)
  const skipped = dropped ? `, без картинки пропущено ${dropped}` : ''
  process.stdout.write(`[extract-words] ${words.length} слов, ${totalScenes} сцен, ${meta.sections.length} секций${skipped} → ${path.relative(ROOT, OUT_DIR)}\n`)
}

module.exports = {
  DEFAULT_SRC,
  MIN_SCENES,
  MIN_WORDS,
  ORACLE_SEED,
  PLACEMENTS,
  SECTION_IDS,
  buildOracle,
  checkScene,
  checkWord,
  makeRng,
  playableWords,
  readPrototype,
  sliceScript,
}

if (require.main === module) main()
