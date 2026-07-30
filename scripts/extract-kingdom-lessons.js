// Вытаскивает нативные данные уроков раздела «Обучение» (Kingdom lessons) из
// hosted-Speakout-курсов (files-api.iqra.space/development/speakout/<level>/ или
// идентичной локальной копии ~/Desktop/jts-lessons/<level>/).
//
// Каждый урок (lessons/<code>.html) инлайнит `window.TASKS = [...]` и медиа как
// DOM-узлы <audio id="auN" src="data:..."> / <video id="vidN" src="data:...">.
// Тропа (index.html) инлайнит `window.ALL` — порядок кодов уроков уровня.
//
// Пишет (по образцу scripts/extract-grammar.js — Playwright читает уже
// вычисленный JS страницы, без ручного парсинга строк):
//   public/learning/index.json   — лёгкий каталог
//     { levels:[{code,label,lessonCount}], <level>:{ lessons:[{code,order,title,taskCount}] } }
//   public/learning/<level>.json — задания уроков уровня
//     { lessons:{ "<code>":{ code, title, tasks:[…нормализованные…] } } }
//   public/learning/media/<level>/<code>-<elId>.<ext> — вынесенные аудио/видео
//
// speak-задания пропускаются (порядок остальных сохраняется).
//
// Запуск:
//   node scripts/extract-kingdom-lessons.js              # локальная копия
//   node scripts/extract-kingdom-lessons.js --src <base> # иной источник (dir|url)
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public/learning')
// Локальный staging медиа (в .gitignore) — отсюда `mc mirror` заливает на
// файл-сервер; в git попадает только лёгкий JSON.
const MEDIA_DIR = path.join(OUT, 'media')
// Публичная база URL медиа на файл-сервере (тот же, что хостит курсы).
// Залив: mc mirror public/learning/media jts/development/learning-media
const MEDIA_URL_BASE = 'https://files-api.iqra.space/development/learning-media'

const LEVELS = [
  { code: 'a1', label: 'A1' },
  { code: 'a2', label: 'A2' },
  { code: 'b1', label: 'B1' },
  { code: 'b2', label: 'B2' },
  { code: 'c1', label: 'C1' },
]

// «Тип» урока для иконки-печеньки на тропе: код FINAL_TEST → final, иначе группа
// ПЕРВОГО задания урока (чем урок открывается): listen→audio, watch/video→video,
// info→info, остальное (choice/chips/gap/check) → choice. Преобладающий тип не
// годится — почти все уроки состоят в основном из choice, тропа была бы
// одноцветной. Держим ту же группировку, что и UI
// (src/screens/KingdomInteriorPage.jsx: taskGroup).
function taskGroup(type) {
  if (type === 'listen') return 'audio'
  if (type === 'watch' || type === 'video') return 'video'
  if (type === 'info') return 'info'
  return 'choice'
}
function lessonType(code, tasks) {
  if (/FINAL_TEST/i.test(code)) return 'final'
  const first = tasks && tasks[0]
  return first ? taskGroup(first.type) : 'choice'
}

// Юниты тропы. Разделение живёт в контенте: у каждого уровня есть уроки-«ревью»
// в конце юнита (названия разнятся: «Unit N Review», «Review & progress check»,
// «Mid-course Checkpoint», «Course Consolidation»). Такой урок ЗАКРЫВАЕТ юнит.
// Экзамены (FINAL_TEST / Progress Test) выносятся в отдельную группу (unit 0).
function isExam(code, title) {
  return /FINAL_TEST|PROGRESS_TEST/i.test(code) || /итоговый тест|final test|cumulative final/i.test(title || '')
}
function isUnitEnd(code, title) {
  return !isExam(code, title) && /review|checkpoint|consolidation|progress\s*check/i.test(title || '')
}

// --src <dir|url>; по умолчанию — локальная копия курсов на Desktop.
function parseSrc() {
  const i = process.argv.indexOf('--src')
  const v = i >= 0 ? process.argv[i + 1] : null
  return v || '/Users/mirasnurlanov/Desktop/jts-lessons'
}
const SRC = parseSrc()
const isUrl = /^https?:\/\//.test(SRC)
const pageUrl = (rel) =>
  isUrl ? `${SRC.replace(/\/$/, '')}/${rel}` : 'file://' + path.join(SRC, rel)

const EXT = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'video/mp4': 'mp4', 'video/webm': 'webm' }

// Классы в info.html — общие слова (table, hl, tag…), могут столкнуться с
// глобальным CSS сайта. Префиксуем в `l-`, стили адресуем только .l-* (как g- у
// грамматики).
const CLASS_PREFIX = 'l-'
function prefixClasses(html) {
  return String(html).replace(/class="([^"]*)"/g, (_, cls) =>
    'class="' + cls.split(/\s+/).filter(Boolean).map((c) => CLASS_PREFIX + c).join(' ') + '"',
  )
}

// Читается в контексте страницы урока. Возвращает сырые TASKS (speak уже убран)
// + карту медиа-узлов (id → data-URI) для тех, что реально используются.
function collectLessonInPage() {
  let T = Array.isArray(window.TASKS) ? window.TASKS : []
  // Финальный тест уровня хранит вопросы в window.Q (не TASKS) — маппим их в
  // choice-задания (q → «слово»-вопрос, options/answer как есть).
  if (!T.length && Array.isArray(window.Q) && window.Q.length) {
    T = window.Q
      .filter((it) => it && it.type === 'choice' && Array.isArray(it.options))
      .map((it) => ({
        type: 'choice',
        sec: it.part ? 'Часть ' + it.part : '',
        title: 'Итоговый тест',
        sub: '',
        word: it.q || '',
        options: it.options,
        answer: it.answer,
      }))
  }
  const usedMedia = new Set()
  const tasks = []
  for (const t of T) {
    if (!t || t.type === 'speak') continue
    tasks.push(t)
    if (t.type === 'listen' && Array.isArray(t.tracks)) {
      for (const tr of t.tracks) if (Array.isArray(tr) && tr[0]) usedMedia.add(String(tr[0]))
    }
    if (t.type === 'watch' || t.type === 'video') {
      usedMedia.add(t.vid ? String(t.vid).replace(/^v(?=\d)/, 'vid') : 'vid1')
    }
  }
  // Разрешаем id медиа-узлов в data-URI. Для watch без явного #vidN берём
  // первый <video> на странице (в уроках он один — #vid1).
  const media = {}
  const firstVideo = document.querySelector('video[id]')
  for (const id of usedMedia) {
    let el = document.getElementById(id)
    if (!el && /^vid/.test(id) && firstVideo) el = firstVideo
    const src = el ? el.getAttribute('src') || '' : ''
    if (src.startsWith('data:')) media[id] = src
  }
  // Заголовок урока: экран завершения хранит "<курс> — <название урока>" в .es;
  // на худой конец — заголовок первой секции.
  let title = ''
  const es = document.querySelector('#sEnd .es, .es')
  if (es) title = (es.textContent || '').split('—').slice(1).join('—').trim()
  if (!title) {
    const st = document.querySelector('#sStart h1, #sStart .st-title, .start-top h1')
    if (st) title = (st.textContent || '').trim()
  }
  // Снимаем бренд-хвост "· Just To Study" / "· Speakout A1" и т.п.
  title = title.replace(/\s*·\s*(just to study|speakout)[^·]*$/i, '').trim()
  return { tasks, media, title }
}

// data:audio/mpeg;base64,XXXX → {buf, ext}
function decodeDataUri(uri) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(uri)
  if (!m) return null
  const mime = m[1]
  const ext = EXT[mime] || (mime.split('/')[1] || 'bin')
  const buf = m[3] === undefined ? null : (m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3])))
  return buf ? { buf, ext } : null
}

// Сырой TASK → нормализованный для нативного плеера. mediaRef(id) → путь файла.
function normalizeTask(t, mediaRef) {
  const base = { type: t.type, sec: t.sec || '', title: t.title || '', sub: t.sub || '' }
  switch (t.type) {
    case 'choice':
      return { ...base, visual: t.visual || null, word: t.word || '', options: t.options || [], answer: t.answer, two: !!t.two }
    case 'gap':
      return { ...base, gapBefore: t.gapBefore || '', gapAfter: t.gapAfter || '', answers: String(t.answer || '').split('|').map((s) => s.trim()).filter(Boolean) }
    case 'chips':
      return { ...base, gapBefore: t.gapBefore || '', gapAfter: t.gapAfter || '', answer: t.answer, bank: t.bank || [] }
    case 'check':
      return { ...base, items: t.items || [] }
    case 'listen':
      return { ...base, tracks: (t.tracks || []).map(([id, label]) => ({ src: mediaRef(String(id)), label: label || '' })).filter((x) => x.src) }
    case 'info':
    case 'read':
      return { ...base, type: 'info', html: prefixClasses(t.html || '') }
    case 'watch':
    case 'video': {
      const id = t.vid ? String(t.vid).replace(/^v(?=\d)/, 'vid') : 'vid1'
      return { ...base, type: 'watch', src: mediaRef(id), vtitle: t.vtitle || t.title || '' }
    }
    default:
      // Неизвестный тип — сохраняем как info-заглушку, чтобы не терять место в
      // очереди, и логируем на прогоне.
      return { ...base, type: 'info', html: '', __unknown: t.type }
  }
}

async function extractLevel(browser, code, label) {
  // 1. Тропа: порядок кодов уроков.
  const idxPage = await browser.newPage()
  await idxPage.route('**/*', (r) => (['media', 'font'].includes(r.request().resourceType()) ? r.abort() : r.continue()))
  await idxPage.goto(pageUrl(`${code}/index.html`), { waitUntil: 'domcontentloaded' })
  const all = await idxPage.evaluate(() => (Array.isArray(window.ALL) ? window.ALL.slice() : []))
  await idxPage.close()
  if (!all.length) throw new Error(`${code}: пустой window.ALL в index.html`)

  fs.mkdirSync(path.join(MEDIA_DIR, code), { recursive: true })

  const lessons = {}
  const catalog = []
  const typeCounts = {}
  let mediaFiles = 0
  let unitNo = 1

  for (let order = 0; order < all.length; order++) {
    const lessonCode = all[order]
    const rel = `${code}/lessons/${lessonCode}.html`
    if (!isUrl && !fs.existsSync(path.join(SRC, `${code}/lessons/${lessonCode}.html`))) {
      console.warn(`  · ${code}/${lessonCode}: нет файла урока — пропуск`)
      continue
    }
    const page = await browser.newPage()
    await page.route('**/*', (r) => (['font'].includes(r.request().resourceType()) ? r.abort() : r.continue()))
    try {
      await page.goto(pageUrl(rel), { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => typeof window.TASKS !== 'undefined', { timeout: 20000 }).catch(() => {})
      const raw = await page.evaluate(collectLessonInPage)
      // Пишем медиа-файлы, строим id → путь.
      const written = {}
      for (const [id, uri] of Object.entries(raw.media)) {
        const dec = decodeDataUri(uri)
        if (!dec) continue
        const fname = `${lessonCode}-${id}.${dec.ext}`
        fs.writeFileSync(path.join(MEDIA_DIR, code, fname), dec.buf)
        written[id] = `${MEDIA_URL_BASE}/${code}/${fname}`
        mediaFiles++
      }
      const mediaRef = (id) => written[id] || null
      const tasks = raw.tasks.map((t) => normalizeTask(t, mediaRef))
      for (const t of tasks) {
        typeCounts[t.type] = (typeCounts[t.type] || 0) + 1
        if (t.__unknown) console.warn(`  ! ${code}/${lessonCode}: неизвестный тип "${t.__unknown}"`)
      }
      // Пустые страницы (BBC-видео-стабы без встроенного контента) не заводят
      // урок — иначе на тропе повис бы пустой узел.
      if (!tasks.length) {
        console.warn(`  · ${code}/${lessonCode}: 0 заданий (стаб без контента) — пропуск`)
        continue
      }
      const title = raw.title || lessonCode
      lessons[lessonCode] = { code: lessonCode, title, tasks }
      const exam = isExam(lessonCode, title)
      const unit = exam ? 0 : unitNo
      catalog.push({ code: lessonCode, order, title, taskCount: tasks.length, type: lessonType(lessonCode, tasks), unit })
      if (!exam && isUnitEnd(lessonCode, title)) unitNo++
    } finally {
      await page.close()
    }
  }

  fs.writeFileSync(path.join(OUT, `${code}.json`), JSON.stringify({ lessons }))
  const kb = (fs.statSync(path.join(OUT, `${code}.json`)).size / 1024) | 0
  console.log(`${code}: ${catalog.length} уроков, ${mediaFiles} медиа → ${code}.json (${kb} KB) · типы ${JSON.stringify(typeCounts)}`)
  return { catalog, label }
}

async function run() {
  // Чистим прошлый вывод (идемпотентность).
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(MEDIA_DIR, { recursive: true })

  const onlyIdx = process.argv.indexOf('--level')
  const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null
  const levels = only ? LEVELS.filter((l) => l.code === only) : LEVELS

  const browser = await chromium.launch()
  const index = { levels: [] }
  try {
    for (const { code, label } of levels) {
      const { catalog } = await extractLevel(browser, code, label)
      index.levels.push({ code, label, lessonCount: catalog.length })
      index[code] = { lessons: catalog }
    }
    fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index))
    const ikb = (fs.statSync(path.join(OUT, 'index.json')).size / 1024) | 0
    console.log(`index.json (${ikb} KB), уровней: ${index.levels.length}`)
  } finally {
    await browser.close()
  }
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

module.exports = { normalizeTask, decodeDataUri, prefixClasses }
