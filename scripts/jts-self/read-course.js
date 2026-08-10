// Достаёт объявления курса из единого HTML-файла уровня (a0.html / a1.html).
//
// Формат объявлений у уровней разный: A0 пишет урок одной строкой с
// JSON-совместимыми ключами, A1 — pretty-print с некавыченными ключами и
// шаблонными строками. Общего парсера на это нет, поэтому литерал вырезается
// по балансу скобок и вычисляется как JS-выражение: источник свой, скачанный
// нами, и другого способа прочитать невалидный для JSON литерал нет.
const fs = require('node:fs')

/** Литерал объявления `const <name>=…` целиком, вместе с внешними скобками. */
function readDecl(src, name) {
  const head = `const ${name}=`
  const start = src.indexOf(head)
  if (start < 0) return null

  let i = start + head.length
  const open = src[i]
  if (open !== '{' && open !== '[') return null
  const close = open === '{' ? '}' : ']'

  let depth = 0
  let quote = ''
  let esc = false
  for (; i < src.length; i++) {
    const ch = src[i]
    if (quote) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return src.slice(start + head.length, i + 1)
    }
  }
  return null
}

function evalDecl(src, name, filePath) {
  const literal = readDecl(src, name)
  if (!literal) return null
  try {
    // eslint-disable-next-line no-eval
    return eval('(' + literal + ')')
  } catch (err) {
    // Голый SyntaxError не говорит, какое объявление и в каком файле
    // сломалось — а вырезанный литерал может быть мегабайтным, руками
    // не найдёшь. Оборачиваем, исходную ошибку сохраняем в cause.
    throw new Error(`не удалось вычислить объявление ${name} в файле ${filePath}: ${err.message}`, { cause: err })
  }
}

/**
 * Код уровня из <title>. Источники расходятся в кодировке разделителя:
 * скачанный вручную файл хранит его как HTML-сущность (&mdash;), а
 * опубликованный бандл — уже раскодированным юникодным тире (—).
 * Полный декодер сущностей тут не нужен: код уровня ищем после любого
 * из двух вариантов разделителя, не раскодируя остальной текст.
 */
function readLevel(src) {
  const m = /<title>[^<]*?(?:—|&mdash;)\s*([A-C][0-2])\b/i.exec(src)
  const label = m ? m[1].toUpperCase() : ''
  if (!label) throw new Error('в файле курса не найден уровень в <title>')
  return { level: label.toLowerCase(), label }
}

function readCourse(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const { level, label } = readLevel(src)

  // UNITS и REVIEWS могут законно отсутствовать (курс без юнит-тестов) —
  // фиксируем это явным `?? []` / `?? {}`, а не полагаемся на побочный
  // эффект `|| []` внутри evalDecl.
  const rawUnits = evalDecl(src, 'UNITS', filePath) ?? []
  const units = rawUnits.map((u, i) => ({ no: i + 1, name: Array.isArray(u) ? u[0] : String(u) }))

  // LESSONS — обязательное объявление: без уроков курс читать бессмысленно,
  // экстрактор не должен молча опубликовать пустой курс.
  const rawLessons = evalDecl(src, 'LESSONS', filePath)
  if (!rawLessons) throw new Error(`в файле курса не найдено объявление LESSONS: ${filePath}`)
  const lessons = Object.keys(rawLessons)
    .map(Number)
    .sort((a, b) => a - b)
    .map((no) => {
      const l = rawLessons[no]
      return {
        no,
        unit: l.unit,
        title: l.title || '',
        blurb: l.blurb || '',
        tracks: l.tracks || {},
        // VOCAB у A0 разложен по режимам, у A1 — плоским списком.
        vocab: Array.isArray(l.VOCAB) ? l.VOCAB : (l.VOCAB && l.VOCAB.self) || [],
        images: l.IMG || {},
        html: l.html || '',
      }
    })

  const rawReviews = evalDecl(src, 'REVIEWS', filePath) ?? {}
  const reviews = Object.keys(rawReviews)
    .map(Number)
    .sort((a, b) => a - b)
    .map((no) => {
      const r = rawReviews[no]
      return { no, unit: r.unit, title: r.title || '', html: r.html || '' }
    })

  return { level, label, units, lessons, reviews }
}

module.exports = { readDecl, readCourse }
