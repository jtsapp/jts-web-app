// Копия прототипа «Literature World» для тестов: вход оракула
// (scripts/literature/extract-oracle.js), источник бандла для vitest и e2e
// (scripts/literature/make-bundle.js), файл для ручной проверки заливки в
// админке (движок тот же байт в байт — админка покажет «движок совпадает»).
//
// Сам прототип (10 МБ: 3.9 МБ пьес, 3.8 МБ сцен и видео в base64) в git не
// кладём. В копии движок и стили — байт в байт, данные урезаны так, чтобы
// ссылки движка на них не порвались:
// - пьесы (sh, ot и «Riders to the Sea» в x.riders) — все акты и сцены на
//   месте (по номерам акта, сцены и реплики ссылаются фразы, темы Ромео и
//   Джульетты, слова и «Элиза» Пигмалиона); в сцене — первые реплики и все
//   реплики, на которые ссылаются данные, остальные до них урезаны до начала первой
//   строки;
// - проза — первые абзацы и абзацы, где стоят слова раздела;
// - слова (x.words) — выборка по источникам и видам, у источника «поэзия»
//   больше 12, чтобы список сворачивался (WLIM движка);
// - сцены и маскоты — пиксель webp своего цвета, видео входа — крошечное mp4,
//   логотип в разметке — пиксель png.
// Остальное (стихи, пословицы, сленг, фразы, эпохи, картинки Wikimedia) —
// целиком: это мелкие блоки.
//
// Запуск: node scripts/literature/make-fixture.js --html "<путь к прототипу>"
// затем   node scripts/literature/make-bundle.js && node scripts/literature/extract-oracle.js

const fs = require('node:fs')
const path = require('node:path')
const P = require('./proto.js')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'literature', '__fixtures__')
// Крошечное mp4 (VP9 в MP4, сигнатура ftyp — её проверяет бэкенд) — то же, что у фикстуры Tenses World.
const TINY_MP4 = fs.readFileSync(path.join(__dirname, '..', 'tenses', 'make-fixture.js'), 'utf8').match(/const TINY_MP4 =\s*'([^']+)'/)[1]
// Прозрачный пиксель png вместо логотипа в разметке (логотипа у порта нет).
const PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
// Сколько первых реплик сцены и абзацев текста остаётся всегда.
const KEEP_BLOCKS = 4
const KEEP_PARAS = 4
// Слов на (источник × вид) и у «поэзии» — больше WLIM (12), чтобы список сворачивался.
const WORDS_PER_KIND = 2
const POETRY_WORDS = 14

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

const lines = (b) => (b.p || []).flatMap((p) => p.v || [p.pr]).filter(Boolean)

/** Реплика, урезанная до первой строки (начало первой строки, до 48 знаков). */
function shrinkBlock(b) {
  if (b.d != null || !b.p || !b.p.length) return b
  const p = b.p[0]
  const first = p.v ? { v: [String(p.v[0] || '').slice(0, 48)] } : { pr: String(p.pr || '').slice(0, 48) }
  return { ...b, p: [first] }
}

/** Где в пьесе первая строка с needle (порядок обхода — как у anchorOf движка). */
function findNeedle(play, needle) {
  const n = needle.toLowerCase()
  for (let ai = 0; ai < play.acts.length; ai++)
    for (let si = 0; si < play.acts[ai].sc.length; si++) {
      const bs = play.acts[ai].sc[si].b
      for (let bi = 0; bi < bs.length; bi++) if (lines(bs[bi]).some((l) => l.toLowerCase().includes(n))) return [ai, si, bi]
    }
  return null
}

/** Нужные реплики каждой пьесы: { play: Set('ai.si.bi') }. */
function neededBlocks(d, words) {
  const need = {}
  const add = (play, a, s, b) => (need[play] ||= new Set()).add(`${a}.${s}.${b}`)
  for (const p of d.x.phrases) add(p.play, p.a, p.si, p.b)
  const rj = d.world.rj
  for (const th of rj.themes || []) for (const q of th.q || []) add('romeo', q.a, q.s, q.b)
  for (const q of rj.speeches || []) add('romeo', q.a, q.s, q.b)
  for (const dv of rj.devices || []) if (dv.q) add('romeo', dv.q.a, dv.q.s, dv.q.b)
  // «Элиза» на странице регистров: Pygmalion, акт 1, сцена 1, реплика 29
  add('pygmalion', 0, 0, 29)
  const plays = { ...d.sh, ...d.ot, riders: d.x.riders.play }
  for (const w of words) {
    if (w.anchor.kind !== 'play' || !plays[w.anchor.id]) continue
    const at = findNeedle(plays[w.anchor.id], w.anchor.needle)
    if (at) add(w.anchor.id, ...at)
  }
  return need
}

function trimPlay(play, need) {
  const keep = need || new Set()
  return {
    ...play,
    acts: play.acts.map((a, ai) => ({
      ...a,
      sc: a.sc.map((s, si) => {
        const mine = s.b.map((_, bi) => keep.has(`${ai}.${si}.${bi}`))
        const last = Math.max(KEEP_BLOCKS - 1, mine.lastIndexOf(true))
        return { ...s, b: s.b.slice(0, last + 1).map((b, bi) => (bi < KEEP_BLOCKS || mine[bi] ? b : shrinkBlock(b))) }
      }),
    })),
  }
}

/** Выборка слов: по источнику и виду, у поэзии — больше WLIM. Из пьес — те, чья строка ближе к началу сцены:
 * реплики до неё остаются в копии (по их номерам ссылаются данные), и глубокая строка тянула бы за собой сцену. */
function pickWords(words, plays) {
  const depth = (w) => {
    if (w.anchor.kind !== 'play' || !plays[w.anchor.id]) return 0
    const at = findNeedle(plays[w.anchor.id], w.anchor.needle)
    return at ? at[2] : 1e6
  }
  const cost = new Map(words.map((w) => [w.id, depth(w)]))
  const cheap = (list) => list.slice().sort((a, b) => cost.get(a.id) - cost.get(b.id))
  const out = []
  const seen = new Set()
  const take = (w) => {
    if (!seen.has(w.id)) {
      seen.add(w.id)
      out.push(w)
    }
  }
  const groups = {}
  for (const w of words) (groups[`${w.cat || 'prose'}|${w.type}`] ||= []).push(w)
  for (const list of Object.values(groups)) cheap(list).slice(0, WORDS_PER_KIND).forEach(take)
  cheap(words.filter((w) => w.cat === 'poetry')).slice(0, POETRY_WORDS).forEach(take)
  // порядок — как в файле: на нём держатся «предыдущее / следующее слово»
  return words.filter((w) => seen.has(w.id))
}

/** Абзацы текста: первые KEEP_PARAS и те, где стоят слова раздела. */
function trimProse(id, R, words) {
  const needles = words.filter((w) => w.anchor.kind === 'text' && w.anchor.id === id).map((w) => w.anchor.needle.toLowerCase())
  const text = (p) => (typeof p === 'string' ? p : Array.isArray(p) ? p.join(' / ') : '').toLowerCase()
  return { ...R, body: (R.body || []).filter((p, i) => i < KEEP_PARAS || needles.some((n) => text(p).includes(n))) }
}

function trim(d) {
  const words = pickWords(d.x.words, { ...d.sh, ...d.ot, riders: d.x.riders.play })
  const need = neededBlocks(d, words)
  const sh = Object.fromEntries(Object.entries(d.sh).map(([id, p]) => [id, trimPlay(p, need[id])]))
  const ot = Object.fromEntries(Object.entries(d.ot).map(([id, p]) => [id, trimPlay(p, need[id])]))
  const prose = Object.fromEntries(Object.entries(d.prose).map(([id, R]) => [id, trimProse(id, R, words)]))
  const proseBody = Object.fromEntries(Object.entries(d.x.proseBody).map(([id, R]) => [id, trimProse(id, R, words)]))
  const x = { ...d.x, words, proseBody, riders: { ...d.x.riders, play: trimPlay(d.x.riders.play, need.riders) } }
  return { ...d, sh, ot, prose, x }
}

/** Пиксель webp цвета от имени: сцены различимы на снимках e2e. */
async function pixel(sharp, name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const buf = await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 120 + (h % 120), g: 60 + ((h >> 8) % 140), b: 140 + ((h >> 16) % 110), alpha: 1 } } })
    .webp({ quality: 50 })
    .toBuffer()
  return 'data:image/webp;base64,' + buf.toString('base64')
}

function counts(d) {
  const plays = { ...d.sh, ...d.ot }
  const scenes = Object.values(plays).reduce((n, p) => n + p.acts.reduce((k, a) => k + a.sc.length, 0), 0)
  return {
    plays: Object.keys(plays).length,
    scenes,
    prose: Object.keys(d.prose).length + Object.keys(d.x.proseBody).length,
    poems: d.x.poems.length,
    words: d.x.words.length,
    images: Object.keys(d.imgmeta).length,
    media: Object.keys(d.scenes).length + Object.keys(d.mascots).length,
  }
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу Literature World>')
  const sharp = require('sharp')
  const html = P.readHtml(src)
  const full = P.engineSha(html)
  if (full.count !== 1) throw new Error(`блоков движка ${full.count}, ждали 1`)
  if (full.sha !== P.ENGINE_SHA) console.warn(`ВНИМАНИЕ: движок прототипа ${full.sha} ≠ перенесённого на сайт ${P.ENGINE_SHA} — порт надо обновить`)
  const data = P.dataOf(html)
  for (const k of P.SCENES) if (!data.scenes[k]) throw new Error(`в прототипе нет сцены ${k}`)
  if (!data.scenes.entrance_video) throw new Error('в прототипе нет видео входа')
  for (const k of P.MASCOTS) if (!data.mascots[k]) throw new Error(`в прототипе нет маскота ${k}`)

  const mini = trim(data)
  for (const k of Object.keys(mini.scenes)) mini.scenes[k] = k === 'entrance_video' ? 'data:video/mp4;base64,' + TINY_MP4 : await pixel(sharp, k)
  for (const k of Object.keys(mini.mascots)) mini.mascots[k] = await pixel(sharp, 'm_' + k)

  // Сборка копии: блоки данных — урезанные, логотип — пиксель; движок, стили и остальная разметка — как в файле.
  let out = ''
  let at = 0
  for (const s of P.scriptsOf(html)) {
    const id = P.dataId(s)
    out += html.slice(at, s.start) + `<script${s.attrs}>${id ? JSON.stringify(mini[id]) : s.body}</script>`
    at = s.end
  }
  out += html.slice(at)
  const logos = out.match(/data:image\/png;base64,[A-Za-z0-9+/=]{1000,}/g) || []
  if (logos.length !== 2) throw new Error(`логотипов в разметке ${logos.length}, ждали 2`)
  for (const l of logos) out = out.replace(l, PIXEL_PNG)
  out = out.replace('<title>The Literature World · Just To Study</title>', '<title>The Literature World (fixture)</title>')

  const check = P.engineSha(out)
  if (check.sha !== full.sha) throw new Error('движок копии разошёлся с прототипом')
  const styles = (h) => P.stylesOf(h).map((s) => s.css).join('\n')
  if (styles(out) !== styles(html)) throw new Error('стили копии разошлись с прототипом')

  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), out)
  const c = counts(mini)
  console.log(
    `prototype-mini.html ${Math.round(out.length / 1024)} КБ: пьес ${c.plays}, сцен ${c.scenes}, прозы ${c.prose}, стихов ${c.poems}, ` +
      `слов ${c.words}, картинок ${c.images}, медиа ${c.media}; движок ${check.sha}`,
  )
}

module.exports = { trim, counts, pickWords }

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
