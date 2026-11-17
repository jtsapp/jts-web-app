// Чтение прототипа «Literature World» (single-file html методиста) — общее для
// сборщика движка, стилей, фикстуры, бандла и оракула.
//
// Устройство файла (спека 2026-11-17-literature-world-design.md, «Прототип»):
// три <style> (основной, #words-x, #lw-img), разметка <body> (шапка, main#app,
// подвал, #pop), восемь <script type="application/json" id="d-…"> — данные, и
// один inline <script> без type — движок. Хэш движка (literature.engine-sha
// бэкенда): блоки без type по порядку, переводы строк к \n, склейка «\n;\n».

const fs = require('node:fs')
const crypto = require('node:crypto')

// sha256 движка файла 17.11.2026 (literature.engine-sha бэкенда, спека «Хэш движка»).
const ENGINE_SHA = '3ca72307b6eeec30f34f97c9683846cbeceb931d05e5ea95351bc03dc9bcfd8b'
const SEP = '\n;\n'
// Блоки данных: id без «d-» — ключ бандла (спека, «Контракт»).
const DATA_IDS = ['sh', 'ot', 'prose', 'world', 'x', 'imgmeta', 'mascots', 'scenes']
const MASCOTS = ['dexter', 'luna', 'spark', 'aizere']
const SCENES = ['archive', 'entrance', 'globe', 'gothic', 'hall', 'library', 'nursery', 'poets', 'press', 'streets', 'theatre', 'writers', 'c_aizere', 'c_dexter', 'c_luna', 'c_spark']

const readHtml = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n')

/** Все <script> в порядке файла. */
function scriptsOf(html) {
  const out = []
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) out.push({ attrs: m[1], body: m[2], start: m.index, end: re.lastIndex })
  return out
}

const isPlain = (s) => !/\btype\s*=/.test(s.attrs) && !/\bsrc\s*=/.test(s.attrs)
const dataId = (s) => {
  if (!/\btype\s*=\s*"application\/json"/.test(s.attrs)) return null
  const m = s.attrs.match(/\bid\s*=\s*"d-([a-z]+)"/)
  return m ? m[1] : null
}

/** Блоки движка (inline-скрипты без type) — как есть, с переводами строк \n. */
const engineBlocks = (html) => scriptsOf(html).filter(isPlain).map((s) => s.body.replace(/\r\n?/g, '\n'))

/** sha256 движка по правилу спеки. */
function engineSha(html) {
  const blocks = engineBlocks(html)
  return { sha: crypto.createHash('sha256').update(blocks.join(SEP)).digest('hex'), count: blocks.length }
}

/** Текст блоков данных: { sh: '…json…', … }. */
function dataTexts(html) {
  const out = {}
  for (const s of scriptsOf(html)) {
    const id = dataId(s)
    if (id) out[id] = s.body
  }
  return out
}

/** Блоки данных разобранными: { sh, ot, prose, world, x, imgmeta, mascots, scenes }. */
function dataOf(html) {
  const texts = dataTexts(html)
  const out = {}
  for (const id of DATA_IDS) {
    if (texts[id] == null) throw new Error(`в прототипе нет блока d-${id}`)
    out[id] = JSON.parse(texts[id])
  }
  return out
}

/** Три <style> по порядку (основной, #words-x, #lw-img). */
function stylesOf(html) {
  const out = []
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/g
  let m
  while ((m = re.exec(html))) out.push({ attrs: m[1], css: m[2] })
  return out
}

module.exports = { ENGINE_SHA, SEP, DATA_IDS, MASCOTS, SCENES, readHtml, scriptsOf, isPlain, dataId, engineBlocks, engineSha, dataTexts, dataOf, stylesOf }
