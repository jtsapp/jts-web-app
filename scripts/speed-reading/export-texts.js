// Тексты Скорочтения из прототипа кабинета → JSON для web-admin («Скорочтение» → «Импорт JSON»).
//
// Тексты живут на бэкенде (их правит контент-менеджер в админке), а пришли в прототипе
// `data/jts-student-cabinet.html` литералом SR_TEXTS: в v1.1 — восемь, в v1.2 (30.10.2026) — 250 (A1–C1 × 50 жанров).
// Формат — как в прототипе ({id, lv, ic, t:{ru,kk,en}, x, g, c, snd}): его же принимает импорт бэкенда, существующие
// id обновляются, новые создаются.
//
// Отличия от прототипа:
// - id: у 190 текстов v1.2 в id подчёркивание (a1_inflight), а бэкенд принимает только `^[a-z0-9]+(-[a-z0-9]+)*$`
//   — подчёркивание становится дефисом (a1-inflight). Восемь id v1.1 (hello, weather…) не меняются: на них
//   попытки учеников. Совпадение двух id после замены — ошибка, а не тихая перезапись;
// - голос: в прототипе его нет (там синтез браузера). ТЗ v1.2 §5 — голос под ситуацию (футбольный комментарий —
//   мужской); жанры с мужским диктором — MALE_GENRES, у остальных голос не указан: новые тексты получают голос по
//   умолчанию (uk-female), а у существующих он не меняется — их готовые образцы не пересинтезируются зря.
//
// Запуск: node scripts/speed-reading/export-texts.js [--html data/jts-student-cabinet.html] [--out build/speed-reading/texts.json]

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { sliceConst } = require('../lib/js-slice.js')

const ROOT = path.join(__dirname, '..', '..')
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const CATEGORIES = new Set(['travel', 'city', 'media', 'work', 'life'])
// Жанры, где в жизни звучит мужской голос диктора; правка — здесь или голосом текста в админке.
const MALE_GENRES = new Set(['sportscomm', 'stadium', 'documentary', 'taxi', 'ship', 'presscon', 'court'])

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

/** id прототипа → id бэкенда. */
const backendId = (id) => String(id).trim().toLowerCase().replace(/_/g, '-')

/** SR_TEXTS прототипа как массив для импорта; падает на неполной записи — лучше упасть, чем залить брак. */
function readTexts(html) {
  const decl = sliceConst(html, 'SR_TEXTS')
  const list = vm.runInNewContext(`(${decl.replace(/^const\s+SR_TEXTS\s*=/, '')})`)
  if (!Array.isArray(list) || !list.length) throw new Error('SR_TEXTS пуст')
  const seen = new Map()
  return list.map((t) => {
    const ok = t && t.id && t.lv && t.ic && t.t && t.t.ru && t.t.kk && t.t.en && typeof t.x === 'string' && t.x.trim()
    if (!ok) throw new Error(`неполный текст: ${JSON.stringify(t).slice(0, 120)}`)
    const id = backendId(t.id)
    if (!ID_RE.test(id) || id.length > 48) throw new Error(`id не годится для бэкенда: ${t.id} → ${id}`)
    if (seen.has(id)) throw new Error(`два текста с одним id после замены «_» → «-»: ${seen.get(id)} и ${t.id}`)
    seen.set(id, t.id)
    const out = { id, lv: t.lv, ic: t.ic, t: { ru: t.t.ru, kk: t.t.kk, en: t.t.en }, x: t.x }
    // v1.2: жанр, группа, сцена. У прототипа v1.1 их нет — тогда и в файле нет (импорт оставит как было).
    if (t.g != null) {
      if (!KEY_RE.test(t.g)) throw new Error(`${t.id}: жанр «${t.g}»`)
      out.g = t.g
    }
    if (t.c != null) {
      if (!CATEGORIES.has(t.c)) throw new Error(`${t.id}: группа «${t.c}»`)
      out.c = t.c
    }
    if (t.snd != null) {
      if (!KEY_RE.test(t.snd)) throw new Error(`${t.id}: сцена «${t.snd}»`)
      out.snd = t.snd
    }
    if (MALE_GENRES.has(t.g)) out.voice = 'uk-male'
    return out
  })
}

if (require.main === module) {
  const html = fs.readFileSync(path.resolve(ROOT, arg('--html', 'data/jts-student-cabinet.html')), 'utf8')
  const out = path.resolve(ROOT, arg('--out', 'build/speed-reading/texts.json'))
  const texts = readTexts(html)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(texts, null, 2) + '\n')
  const renamed = texts.filter((t) => t.id.includes('-')).length
  console.log(`${texts.length} текстов (id с «_» → «-»: ${renamed}, мужской голос: ${texts.filter((t) => t.voice).length}) → ${path.relative(ROOT, out)}`)
}

module.exports = { readTexts, backendId, MALE_GENRES }
