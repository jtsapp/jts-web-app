// Забирает картинки и записи раздела «Слова в картинках» с чужого CDN и
// пережимает их в public/practice/words/.
//
// Запуск:
//   node scripts/fetch-words-assets.js                # всё
//   node scripts/fetch-words-assets.js --scene farm   # одна сцена (проверить глазами)
//   node scripts/fetch-words-assets.js --force        # перекачать уже скачанное
//
// ── Зачем это вообще ─────────────────────────────────────────────────────
// Прототип ходит за картинками в CloudFront чужого аккаунта Higgsfield, а за
// записями — на jts-vocabulary-audio.higgsfield.app. Оставлять так нельзя:
// аккаунт может исчезнуть вместе с разделом, а один спрайт весит 4.3 МБ
// (PNG 2048×2048 RGBA) при том, что на сцене он занимает от силы 250 px.
// Забираем к себе один раз и пережимаем: ~5.5 ГБ исходников → ~75 МБ в репо.
//
// Скрипт идемпотентен: рядом лежит assets-manifest.json, и уже скачанное
// пропускается. Прогон ручной, в CI не входит, результат коммитится.

const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const { DEFAULT_SRC, playableWords, readPrototype } = require('./extract-words.js')

const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'practice', 'words')
const MANIFEST = path.join(OUT_DIR, 'assets-manifest.json')

// Спрайт на сцене — максимум 20 % ширины стейджа; на широком экране это ~250 px,
// на ретине ~500. 640 с запасом, дальше только вес без пользы.
const SPRITE_PX = 640
const SCENE_PX = 1600
const COVER_PX = 800
// Одновременных загрузок. Больше — CDN начинает резать; меньше — прогон
// растягивается на часы.
const PARALLEL = 6
const RETRIES = 3

function fail(msg) {
  throw new Error('[fetch-words-assets] ' + msg)
}

function log(msg) {
  process.stdout.write(`[fetch-words-assets] ${msg}\n`)
}

async function download(url) {
  let lastErr = null
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (e) {
      lastErr = e
      // Сетевые ошибки на пяти сотнях файлов — норма, поэтому ретрай с
      // нарастающей паузой, а не падение всего прогона.
      if (attempt < RETRIES) await sleep(600 * attempt)
    }
  }
  return fail(`не скачалось ${url}: ${lastErr && lastErr.message}`)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Пережатие ────────────────────────────────────────────────────────────
// Альфа у спрайтов ОБЯЗАТЕЛЬНА: они лежат поверх фона сцены, и webp без
// прозрачности дал бы белые квадраты на картинке.
async function encodeSprite(buf) {
  return sharp(buf)
    .resize(SPRITE_PX, SPRITE_PX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 90 })
    .toBuffer()
}

async function encodeScene(buf, px) {
  return sharp(buf)
    .resize(px, null, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}

// ── Задания ──────────────────────────────────────────────────────────────
// Одно задание — один файл на выходе: откуда скачать, куда положить, чем сжать.
function planJobs(proto, sceneFilter) {
  const { ENVS, HOSTED, CDN, cleanAudio: audioUrl } = proto
  const words = playableWords(proto)

  const envs = sceneFilter ? ENVS.filter((e) => e.id === sceneFilter) : ENVS
  if (sceneFilter && !envs.length) fail(`нет сцены «${sceneFilter}»`)
  const sceneIds = new Set(envs.map((e) => e.id))
  const pool = sceneFilter
    ? words.filter((w) => sceneIds.has(w.env) || sceneIds.has(w.also))
    : words

  const jobs = []
  for (const w of pool) {
    const src = HOSTED.animals[w.id]
    if (!src) continue // отсеяно ещё в playableWords, но пусть будет явно
    jobs.push({
      key: `sprites/${w.id}`,
      url: CDN + src,
      src,
      out: path.join(OUT_DIR, 'sprites', `${w.id}.webp`),
      encode: encodeSprite,
    })
    jobs.push({
      key: `audio/${w.id}`,
      url: audioUrl(w.id),
      src: audioUrl(w.id),
      out: path.join(OUT_DIR, 'audio', `${w.id}.mp3`),
      encode: null, // mp3 и так 25 КБ — перекодировать нечего
    })
  }
  for (const env of envs) {
    const s = HOSTED.scenes[env.id] || {}
    if (!s.bg) fail(`сцена ${env.id}: нет фона`)
    if (!s.cover) fail(`сцена ${env.id}: нет обложки`)
    jobs.push({
      key: `scenes/${env.id}/bg`,
      url: CDN + s.bg,
      src: s.bg,
      out: path.join(OUT_DIR, 'scenes', env.id, 'bg.webp'),
      encode: (b) => encodeScene(b, SCENE_PX),
    })
    jobs.push({
      key: `scenes/${env.id}/cover`,
      url: CDN + s.cover,
      src: s.cover,
      out: path.join(OUT_DIR, 'scenes', env.id, 'cover.webp'),
      encode: (b) => encodeScene(b, COVER_PX),
    })
  }
  return jobs
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  } catch {
    return {}
  }
}

async function runJob(job, manifest, force) {
  const done = manifest[job.key]
  // Пропускаем только если файл на месте И приехал из того же исходника:
  // перегенерированная картинка на CDN получает новое имя, и её надо забрать.
  if (!force && done && done.src === job.src && fs.existsSync(job.out)) return { skipped: true, bytes: done.bytes }

  const raw = await download(job.url)
  const out = job.encode ? await job.encode(raw) : raw
  fs.mkdirSync(path.dirname(job.out), { recursive: true })
  fs.writeFileSync(job.out, out)
  manifest[job.key] = { src: job.src, bytes: out.length }
  return { skipped: false, bytes: out.length, raw: raw.length }
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const sceneAt = args.indexOf('--scene')
  const sceneFilter = sceneAt > -1 ? args[sceneAt + 1] : null

  const proto = readPrototype(fs.readFileSync(DEFAULT_SRC, 'utf8'))
  const jobs = planJobs(proto, sceneFilter)
  const manifest = readManifest()
  log(`заданий ${jobs.length}${sceneFilter ? ` (сцена ${sceneFilter})` : ''}`)

  let done = 0
  let skipped = 0
  let bytes = 0
  let rawBytes = 0
  const queue = jobs.slice()
  const workers = Array.from({ length: PARALLEL }, async () => {
    for (;;) {
      const job = queue.shift()
      if (!job) return
      const r = await runJob(job, manifest, force)
      done++
      bytes += r.bytes
      if (r.skipped) skipped++
      else rawBytes += r.raw
      if (done % 50 === 0) log(`${done}/${jobs.length}`)
    }
  })
  await Promise.all(workers)

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8')
  log(
    `готово: ${done} файлов (пропущено ${skipped}), ` +
      `скачано ${mb(rawBytes)} → сохранено ${mb(bytes)}`,
  )
}

function mb(n) {
  return `${(n / 1024 / 1024).toFixed(1)} МБ`
}

module.exports = { COVER_PX, SCENE_PX, SPRITE_PX, encodeScene, encodeSprite, planJobs }

if (require.main === module) {
  main().catch((e) => {
    process.stderr.write(String((e && e.stack) || e) + '\n')
    process.exit(1)
  })
}
