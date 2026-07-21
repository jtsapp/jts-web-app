// Вытаскивает из standalone «грамматика_практика.html» (оболочка с 5 вложенными
// уровневыми курсами A1–C1) данные для нативного раздела «Грамматика» Практики:
//   public/practice/grammar/index.json   — лёгкий каталог всех уровней
//     { levels:[{code,label}], a1:{sections:[{k,name,theme}], themes:[{a,b}],
//       units:[{id,secKey,secName,theme,title,desc,exA,exB,diff,min}]}, a2:{…}, … }
//   public/practice/grammar/<level>.json  — тяжёлый контент уроков уровня
//     { units:{ "1":{learn:[{ic,bg,title,html}], learnTr:[{ru,kk}|null],
//       activities:[…journeyFor]}, … } }
//
// Контент и логика берутся 1-в-1 из движка курса: HTML-блоки теории уже
// собраны шаблонными строками (tl()/breakdown и т.п. вычислены при загрузке),
// упражнения — ровно то, что отдаёт journeyFor(u) (PRACTICE_V2 → иначе
// buildJourney). Никакой ручной правки контента.
//
// Запуск: node scripts/extract-grammar.js [путь-к-грамматика_практика.html]
const fs = require('fs')
const path = require('path')
const os = require('os')
const { chromium } = require('playwright')

const ROOT = path.join(__dirname, '..')
const SRC = process.argv[2] || '/Users/mirasnurlanov/Desktop/грамматика_практика.html'
const OUT = path.join(ROOT, 'public/practice/grammar')

const LEVELS = [
  { code: 'a1', label: 'A1' },
  { code: 'a2', label: 'A2' },
  { code: 'b1', label: 'B1' },
  { code: 'b2', label: 'B2' },
  { code: 'c1', label: 'C1' },
]

// Внутри оболочки каждый курс лежит в <script type="text/plain" id="course-XX">,
// а его собственный закрывающий </script> экранирован как <\/script>.
function extractCourses(html) {
  const re = /<script type="text\/plain" id="course-(\w+)"[^>]*>\n([\s\S]*?)\n<\/script>/g
  const out = {}
  let m
  while ((m = re.exec(html))) out[m[1]] = m[2].replace(/<\\\/script>/g, '</script>')
  return out
}

// Собираем данные уровня внутри страницы курса, опираясь ТОЛЬКО на её движок:
// те же unitById / LESSONS / genericLesson / journeyFor / LESSON_TR, что и в
// openLesson(). Так контент и активности гарантированно совпадают 1-в-1.
function collectInPage() {
  const rows = U // глобальный массив юнитов курса
  const light = []
  const heavy = {}
  for (const r of rows) {
    const u = toUnit(r)
    const L = typeof LESSONS !== 'undefined' && LESSONS[u.id] ? LESSONS[u.id] : genericLesson(u)
    const learn = (L.learn || []).map((b) => ({ ic: b.ic, bg: b.bg, title: b.title, html: b.html }))
    const trSrc = typeof LESSON_TR !== 'undefined' ? LESSON_TR[String(u.id)] : null
    const learnTr = learn.map((_, i) => {
      const t = trSrc && trSrc[i]
      if (!t) return null
      const pick = (o) => (o && o.html ? { title: o.title || '', html: o.html } : null)
      return { ru: pick(t.ru), kk: pick(t.kk) }
    })
    const activities = journeyFor(u)
    light.push({
      id: u.id, secKey: u.secKey, secName: u.secName, theme: u.theme,
      title: u.title, desc: u.desc, exA: u.exA, exB: u.exB,
      diff: u.diff, min: u.min, level: u.level,
    })
    heavy[u.id] = { learn, learnTr, activities }
  }
  return {
    sections: SECTIONS.map((s) => ({ k: s.k, name: s.name, theme: s.theme })),
    themes: typeof THEMES !== 'undefined' ? THEMES : [],
    units: light,
    heavy,
  }
}

// Классы внутри извлечённого HTML — общие слова (chat, msg, sit, dot, hl…) и
// сталкиваются с существующими стилями сайта (.chat в tutor.css, .dot в
// styles.css): чужое правило протекает в теми свойствами, которых нет в нашем.
// Поэтому на выгрузке префиксуем каждый класс в `g-` — контент становится
// полностью изолированным, а grammar.css адресует только .g-*.
const CLASS_PREFIX = 'g-'
function prefixClasses(s) {
  return s.replace(
    /class="([^"]*)"/g,
    (_, cls) =>
      'class="' +
      cls
        .split(/\s+/)
        .filter(Boolean)
        .map((c) => CLASS_PREFIX + c)
        .join(' ') +
      '"',
  )
}
function deepPrefix(v) {
  if (typeof v === 'string') return prefixClasses(v)
  if (Array.isArray(v)) return v.map(deepPrefix)
  if (v && typeof v === 'object') {
    const o = {}
    for (const k of Object.keys(v)) o[k] = deepPrefix(v[k])
    return o
  }
  return v
}

async function run() {
  if (!fs.existsSync(SRC)) throw new Error(`Не найден исходник: ${SRC}`)
  const html = fs.readFileSync(SRC, 'utf8')
  const courses = extractCourses(html)
  const missing = LEVELS.filter((l) => !courses[l.code])
  if (missing.length) throw new Error(`Нет курсов в файле: ${missing.map((l) => l.code).join(', ')}`)

  fs.mkdirSync(OUT, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jts-grammar-'))
  const browser = await chromium.launch()
  const index = { levels: LEVELS }

  try {
    for (const { code } of LEVELS) {
      const file = path.join(tmp, `course-${code}.html`)
      fs.writeFileSync(file, courses[code])
      const page = await browser.newPage()
      // Блокируем внешние картинки/шрифты (иммерсив-режим тянет CDN) — движок
      // и данные определяются синхронно, ждать сеть не нужно.
      await page.route('**/*', (route) => {
        const t = route.request().resourceType()
        if (t === 'image' || t === 'font' || t === 'media') return route.abort()
        return route.continue()
      })
      await page.goto('file://' + file, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(
        () => typeof U !== 'undefined' && typeof journeyFor === 'function' && typeof toUnit === 'function',
        { timeout: 20000 },
      )
      const raw = await page.evaluate(collectInPage)
      await page.close()
      const data = deepPrefix(raw)

      index[code] = { sections: data.sections, themes: data.themes, units: data.units }
      fs.writeFileSync(path.join(OUT, `${code}.json`), JSON.stringify({ units: data.heavy }))
      const kb = (fs.statSync(path.join(OUT, `${code}.json`)).size / 1024) | 0
      console.log(`${code}: ${data.units.length} юнитов, ${data.sections.length} секций → ${code}.json (${kb} KB)`)
    }
    fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index))
    const ikb = (fs.statSync(path.join(OUT, 'index.json')).size / 1024) | 0
    console.log(`index.json (${ikb} KB), уровней: ${LEVELS.length}`)
  } finally {
    await browser.close()
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
