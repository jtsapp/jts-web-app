// Разрезает standalone-прототип Словаря (public/vocab/index.html, ~5.9 МБ:
// 15 472 слова одним инлайн-массивом) на данные для нативного раздела:
//   public/practice/vocab/index.json          — мета: уровни, сферы, счётчики
//   public/practice/vocab/essential-<lvl>.json — слова уровня A1…C1
//   public/practice/vocab/field-<key>.json     — слова проф. сферы
//   src/practice/vocab/strings.js              — I18N (ru/kk) + FIELDS/LEVELS
// Так экран грузит только нужную выборку (~0.2–1 МБ), а не весь массив.
//
// Запуск: node scripts/extract-vocab.js [путь-к-index.html]
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = process.argv[2] || path.join(ROOT, 'public/vocab/index.html')
const OUT = path.join(ROOT, 'public/practice/vocab')
const OUT_STRINGS = path.join(ROOT, 'src/practice/vocab/strings.js')
const OUT_CSS = path.join(ROOT, 'src/vocab.css')

const html = fs.readFileSync(SRC, 'utf8')

function grab(re, what) {
  const m = html.match(re)
  if (!m) throw new Error(`не найдено: ${what} — прототип изменился`)
  return m[1]
}

const WORDS = JSON.parse(grab(/const WORDS=(\[[\s\S]*?\]);/, 'const WORDS'))
// I18N/FIELDS/LEVELS — литералы без вычислений, безопасно снять eval'ом.
const I18N = eval('(' + grab(/const I18N = (\{[\s\S]*?\n\});/, 'const I18N') + ')')
const FIELDS = eval('(' + grab(/const FIELDS=(\[[\s\S]*?\n\]);/, 'const FIELDS') + ')')
const LEVELS = eval('(' + grab(/const LEVELS=(\[[^\]]*\]);/, 'const LEVELS') + ')')
const FIELD_CATS = eval('(' + grab(/const FIELD_CATS=(\[[^\]]*\]);/, 'const FIELD_CATS') + ')')
const COLLECTN = eval('(' + grab(/const COLLECTN=(\{[^}]*\});/, 'const COLLECTN') + ')')
const TIMES = eval('(' + grab(/const TIMES=(\[[^\]]*\]);/, 'const TIMES') + ')')

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(path.dirname(OUT_STRINGS), { recursive: true })

const write = (file, data) => {
  const p = path.join(OUT, file)
  fs.writeFileSync(p, JSON.stringify(data))
  return (fs.statSync(p).size / 1024) | 0
}

// Слова уровня (essential) и сферы (personalized) — отдельными файлами.
const index = { levels: LEVELS, fieldCats: FIELD_CATS, fields: [], essential: {}, times: TIMES, collectN: COLLECTN }

for (const lvl of LEVELS) {
  const ws = WORDS.filter((w) => w.mode === 'essential' && w.lvl === lvl)
  const kb = write(`essential-${lvl.toLowerCase()}.json`, ws)
  index.essential[lvl] = ws.length
  console.log(`essential ${lvl}: ${ws.length} слов (${kb} KB)`)
}

for (const f of FIELDS) {
  const ws = WORDS.filter((w) => w.mode === 'personalized' && w.field === f.key)
  if (!ws.length) {
    console.log(`сфера ${f.key}: слов нет — пропускаем`)
    continue
  }
  const kb = write(`field-${f.key}.json`, ws)
  index.fields.push({ key: f.key, ic: f.ic, cat: f.cat, count: ws.length })
  console.log(`сфера ${f.key}: ${ws.length} слов (${kb} KB)`)
}

const ikb = write('index.json', index)
console.log(`index.json (${ikb} KB): уровней ${LEVELS.length}, сфер ${index.fields.length}`)

// Строки интерфейса и мета — модулем, чтобы не тянуть их сетью.
// Часть строк в I18N — функции-шаблоны (fldWords(n), ovShown(a,b), …).
// JSON.stringify их молча выбрасывает, поэтому сериализуем сами: функции
// печатаем исходником, остальное — как JSON.
function serialize(v, indent = 2) {
  const pad = ' '.repeat(indent)
  if (typeof v === 'function') return v.toString()
  if (Array.isArray(v)) return JSON.stringify(v)
  if (v && typeof v === 'object') {
    const body = Object.keys(v)
      .map((k) => `${pad}  ${JSON.stringify(k)}: ${serialize(v[k], indent + 2)}`)
      .join(',\n')
    return `{\n${body}\n${pad}}`
  }
  return JSON.stringify(v)
}

const fnCount = Object.values(I18N).reduce(
  (n, d) => n + Object.values(d).filter((x) => typeof x === 'function').length,
  0,
)

const strings = `// Строки и мета Словаря — сняты 1-в-1 из public/vocab/index.html
// скриптом scripts/extract-vocab.js. Руками не править: при обновлении
// прототипа перегенерировать.

export const I18N = ${serialize(I18N)}

export const LEVELS = ${JSON.stringify(LEVELS)}
export const FIELDS = ${JSON.stringify(FIELDS, null, 2)}
export const FIELD_CATS = ${JSON.stringify(FIELD_CATS)}
export const TIMES = ${JSON.stringify(TIMES)}
export const COLLECT_N = ${JSON.stringify(COLLECTN)}

// t() прототипа: словарь по языку с откатом на ru.
export function tx(lang) {
  return I18N[lang] || I18N.ru
}
`
fs.writeFileSync(OUT_STRINGS, strings)
console.log(
  `strings.js (${(fs.statSync(OUT_STRINGS).size / 1024) | 0} KB): языки ${Object.keys(I18N).join(', ')}, функций-шаблонов ${fnCount}`,
)

/* ─────────────────────────── CSS ───────────────────────────
   Стили прототипа переносим как есть, но изолируем: имена классов у него
   общие (.card, .btn, .chip, .stage, .prog) и уже заняты сайтом — чужие
   правила протекали бы свойствами, которых нет в наших. Поэтому:
   каждый класс → .v-*, каждый селектор под корнем .vc, :root → .vc,
   имена @keyframes → v-* (они глобальны), правила html/body отбрасываем —
   оболочку теперь даёт LearningLayout. */
function parseRules(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    const open = src.indexOf('{', i)
    if (open < 0) break
    const sel = src.slice(i, open).trim()
    let depth = 1
    let j = open + 1
    while (j < src.length && depth) {
      if (src[j] === '{') depth++
      else if (src[j] === '}') depth--
      j++
    }
    out.push({ sel, body: src.slice(open + 1, j - 1) })
    i = j
  }
  return out
}
const prefixClasses = (s) =>
  s.replace(/\.(-?[a-zA-Z_][\w-]*)/g, (m, n) => (n.startsWith('v-') ? m : '.v-' + n))
const scopeSel = (s) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      if (/^(from|to|\d+%)$/.test(x)) return x
      if (x === ':root') return '.vc'
      if (/^(html|body)$/.test(x)) return null
      if (x === '*') return '.vc *'
      return '.vc ' + prefixClasses(x)
    })
    .filter(Boolean)
    .join(', ')

function buildCss() {
  const raw = grab(/<style>([\s\S]*?)<\/style>/, '<style>').replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = parseRules(raw)
  const frames = []
  const out = []
  for (const r of rules) {
    if (/^@keyframes/.test(r.sel)) {
      frames.push(r.sel.split(/\s+/)[1])
      out.push(r.sel + '{' + r.body + '}')
    } else if (/^@media|^@supports/.test(r.sel)) {
      const inner = parseRules(r.body)
        .map((x) => {
          const s = scopeSel(x.sel)
          return s ? s + '{' + x.body + '}' : ''
        })
        .filter(Boolean)
        .join('\n  ')
      out.push(r.sel + '{\n  ' + inner + '\n}')
    } else {
      const s = scopeSel(r.sel)
      if (s) out.push(s + '{' + r.body + '}')
    }
  }
  let css = out.join('\n')
  for (const n of frames) css = css.replace(new RegExp('@keyframes\\s+' + n + '\\b', 'g'), '@keyframes v-' + n)
  css = css.replace(/(animation(?:-name)?\s*:)([^;{}]*)/g, (m, head, val) => {
    let v = val
    for (const n of frames) v = v.replace(new RegExp('(^|[\\s,])' + n + '($|[\\s,])', 'g'), '$1v-' + n + '$2')
    return head + v
  })
  return { css, rules: rules.length, frames: frames.length }
}

// Слой интеграции (единственное, что дописано к перенесённым стилям):
// в прототипе экраны лежали абсолютом внутри рамки .phone во всю высоту,
// а здесь одновременно смонтирован ровно один экран внутри LearningLayout —
// поэтому раскладываем его потоком и ограничиваем колонку по центру.
const INTEGRATION = `
/* ── интеграция в оболочку сайта (дописано скриптом, не из прототипа) ── */
.vc{
  position:relative; display:flex; flex-direction:column;
  background:var(--surface); min-height:clamp(560px, calc(100dvh - 72px), 1200px);
}
.vc .v-screen{ position:relative; inset:auto; flex:1; min-height:0; opacity:1 }
.vc .v-screen:not(.v-show){ display:none }
.vc .v-scroll{ padding-bottom:8px }
`

const built = buildCss()
fs.writeFileSync(
  OUT_CSS,
  `/* Стили Словаря — перенесены 1-в-1 из public/vocab/index.html скриптом
   scripts/extract-vocab.js. Классы префиксованы v-*, всё под корнем .vc,
   имена @keyframes — v-*: имена прототипа (.card/.btn/.chip/.stage) уже
   заняты сайтом. Руками не править — перегенерировать скриптом. */
${built.css}
${INTEGRATION}`,
)
console.log(`vocab.css (${(fs.statSync(OUT_CSS).size / 1024) | 0} KB): правил ${built.rules}, keyframes ${built.frames}`)
