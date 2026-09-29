// Выгружает стадию чтения из оригинального файла курса в
// data/course-reading/<level>.json — источник чтения для уроков «Обучения»
// (см. scripts/selfstudy/reading-steps.js, почему чтение берётся отсюда, а не
// из self-study редакции).
//
// Файлы курса весят 100–340 МБ (записи и картинки в base64), в репозиторий их
// не кладём: из урока берётся только разметка стадии Reading (у A1 — Read),
// только режим self — блоки для группы и занятия один на один курс прячет
// правилом [data-only], и сайт их не играет, — и без кнопок, стилей и
// служебных атрибутов движка. Выходит ~1 МБ на уровень.
//
// Запуск:
//   node --max-old-space-size=12000 scripts/import-course-reading.js \
//     --level b1 --src ~/Downloads/B1_inter_fixed.html
const fs = require('node:fs')
const path = require('node:path')
const { JSDOM } = require('jsdom')

const ROOT = path.join(__dirname, '..')
const STAGES = ['Reading', 'Read']
// Атрибуты, по которым reading-steps.js находит ответы; остальное — движку.
const KEEP_ATTR = new Set(['class', 'data-answer', 'data-correct', 'data-val', 'data-multi', 'data-order', 'data-why', 'data-task', 'data-open', 'data-stage', 'value'])

/**
 * Разметка уроков: `N:{unit:…, no:…, title:"…", …, html:`…`}`. Литерал html —
 * шаблонная строка, поэтому граница ищется по неэкранированной обратной
 * кавычке, а номер урока — по ближайшему заголовку перед ней (между ними
 * лежат словарь и картинки урока на сотни килобайт).
 */
function readLessons(src) {
  const heads = [...src.matchAll(/(?:^|[\n,{])\s*"?(\w+)"?\s*:\s*\{\s*unit\s*:\s*(\d+)[^{}]{0,200}?title\s*:\s*"([^"]*)"/g)].map((m) => ({
    pos: m.index,
    key: m[1],
    title: m[3],
  }))
  const out = []
  for (let at = 0; ; ) {
    const i = src.indexOf('html:`', at)
    if (i < 0) break
    let j = i + 6
    for (; j < src.length; j++) {
      if (src[j] === '\\') j++
      else if (src[j] === '`') break
    }
    at = j + 1
    const head = heads.filter((h) => h.pos < i).pop()
    if (head) out.push({ key: head.key, title: head.title, html: src.slice(i + 6, j) })
  }
  return out
}

/** Стадия чтения урока: только self, без движка. null — стадии нет. */
function readingStage(html) {
  const doc = new JSDOM(`<body>${html}</body>`).window.document
  const stage = [...doc.querySelectorAll('section.stage')].find((s) => STAGES.includes(s.getAttribute('data-stage')))
  if (!stage) return null
  stage.querySelectorAll('[data-only]').forEach((el) => {
    if (!/\bself\b/.test(el.getAttribute('data-only'))) el.remove()
  })
  stage.querySelectorAll('script, style, button.btn, .res, .wsave, textarea').forEach((el) => el.remove())
  for (const el of [stage, ...stage.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) if (!KEEP_ATTR.has(a.name)) el.removeAttribute(a.name)
  }
  return stage.outerHTML.replace(/\n\s*/g, '\n')
}

function main() {
  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`)
    return i > 0 ? process.argv[i + 1] : null
  }
  const level = arg('level')
  const src = arg('src')
  if (!level || !src) {
    console.error('нужны --level <a1|a2|b1|b2> и --src <файл курса.html>')
    process.exit(1)
  }
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/course', level, 'index.json'), 'utf8'))
  const titles = new Map(catalog.lessons.map((l) => [String(l.n), l.title]))
  const lessons = {}
  const skipped = []
  for (const l of readLessons(fs.readFileSync(src, 'utf8'))) {
    // Только уроки: тесты юнитов в файле курса — свои ключи, и чтение в них
    // у сайта своё.
    if (!/^\d+$/.test(l.key) || !titles.has(l.key)) continue
    const html = readingStage(l.html)
    if (!html) continue
    // Номер урока в файле обязан совпасть с уроком сайта по теме: иначе текст
    // встанет в чужой урок.
    const norm = (t) => String(t).toLowerCase().replace(/&[a-z]+;/g, "'").replace(/[^a-z]+/g, ' ').trim()
    if (norm(titles.get(l.key)) !== norm(l.title)) {
      skipped.push(`${l.key}: «${l.title}» ≠ «${titles.get(l.key)}»`)
      continue
    }
    lessons[l.key] = { title: l.title, html }
  }
  const out = path.join(ROOT, 'data/course-reading', `${level}.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, `${JSON.stringify({ level, source: path.basename(src), lessons }, null, 1)}\n`)
  console.log(`${level}: уроков с чтением ${Object.keys(lessons).length} → ${path.relative(ROOT, out)} (${Math.round(fs.statSync(out).size / 1024)} КБ)`)
  if (skipped.length) console.log(`  не совпала тема урока, пропущено:\n  ${skipped.join('\n  ')}`)
}

module.exports = { readLessons, readingStage }

if (require.main === module) main()
