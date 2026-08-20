// Достаёт объявления курса из единого HTML-файла уровня (a0.html / a1.html).
//
// Формат объявлений у уровней разный: A0 пишет урок одной строкой с
// JSON-совместимыми ключами, A1 — pretty-print с некавыченными ключами и
// шаблонными строками. Общего парсера на это нет, поэтому литерал вырезается
// по балансу скобок и вычисляется как JS-выражение: источник свой, скачанный
// нами, и другого способа прочитать невалидный для JSON литерал нет.
const fs = require('node:fs')

/**
 * Литерал объявления `const <name>=…` целиком, вместе с внешними скобками.
 *
 * Считаем скобки, но пропускаем всё, где они не структурные: строки, шаблоны,
 * комментарии и регулярные выражения. Наивного «строка до закрывающей кавычки»
 * не хватает — в выгрузке Pre-Intermediate внутри шаблона есть вложенный
 * шаблон и регулярка с апострофом:
 *
 *   `<div>${q.speak ? ` <span onclick="sayWord('${q.w.replace(/'/g,"\\'")}')">` : ''}</div>`
 *
 * Прежний сканер принимал вложенный обратный апостроф за конец внешнего
 * шаблона, дальше читал код как строку и обрывал литерал на середине —
 * курс не читался вовсе («Unexpected token ';'»).
 */
function readDecl(src, name) {
  const head = `const ${name}=`
  const start = src.indexOf(head)
  if (start < 0) return null

  let i = start + head.length
  const open = src[i]
  if (open !== '{' && open !== '[') return null

  // Стек разбора: кадр кода считает свои скобки, строковый кадр ждёт кавычку,
  // шаблонный — обратный апостроф либо `${`, который снова открывает код.
  const frames = [{ kind: 'code', depth: 0, fromTemplate: false }]
  let esc = false
  // Регулярку от деления отличаем по предыдущему значащему символу: после
  // значения (идентификатор, число, закрывающая скобка) слэш — это деление.
  let prev = ''

  for (; i < src.length; i++) {
    const ch = src[i]
    const frame = frames[frames.length - 1]

    if (frame.kind === 'string') {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === frame.quote) frames.pop()
      continue
    }

    if (frame.kind === 'template') {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '`') frames.pop()
      else if (ch === '$' && src[i + 1] === '{') {
        frames.push({ kind: 'code', depth: 0, fromTemplate: true })
        i++
      }
      continue
    }

    // Дальше — режим кода.
    if (ch === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i)
      if (i < 0) return null
      continue
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      if (end < 0) return null
      i = end + 1
      continue
    }
    if (ch === '/' && !/[\w$)\]]/.test(prev)) {
      i = skipRegex(src, i)
      if (i < 0) return null
      prev = '/'
      continue
    }
    if (ch === '"' || ch === "'") { frames.push({ kind: 'string', quote: ch }); prev = ch; continue }
    if (ch === '`') { frames.push({ kind: 'template' }); prev = ch; continue }

    if (ch === '{' || ch === '[') frame.depth++
    else if (ch === '}' || ch === ']') {
      // Закрылась подстановка `${…}` — возвращаемся в шаблон. Проверяем ДО
      // уменьшения: открывающая скобка подстановки в depth не считалась.
      if (frame.fromTemplate && frame.depth === 0) {
        frames.pop()
        prev = '}'
        continue
      }
      frame.depth--
      // Внешняя скобка объявления закрылась — литерал целиком.
      if (frames.length === 1 && frame.depth === 0) return src.slice(start + head.length, i + 1)
    }
    if (!/\s/.test(ch)) prev = ch
  }
  return null
}

/** Индекс закрывающего слэша регулярки (класс [...] экранирование учитываются). */
function skipRegex(src, i) {
  let inClass = false
  for (let j = i + 1; j < src.length; j++) {
    const ch = src[j]
    if (ch === '\\') { j++; continue }
    if (ch === '\n') return -1
    if (ch === '[') inClass = true
    else if (ch === ']') inClass = false
    else if (ch === '/' && !inClass) return j
  }
  return -1
}

function evalDecl(src, name, filePath) {
  const literal = readDecl(src, name)
  if (!literal) return null
  try {
    // no-eval в конфиге проекта не включён (eslint-config-next его не задаёт),
    // поэтому построчный disable тут был бы «unused eslint-disable directive» —
    // не подавляем то, чего нет.
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
function readLevel(src, filePath) {
  // Уровень ищем по всему заголовку, а не сразу за тире. Ранние выгрузки
  // назывались «just to study — A0 · Course», а новые пишут ступень словами:
  // «— Pre-Intermediate A2 · Course», «— Intermediate B1+ · Course». Прежний
  // шаблон требовал код вплотную к тире и на таких файлах падал с «уровень не
  // найден» — курс не читался вовсе. Плюс в «B1+» к коду уровня не относится:
  // в приложении уровни — a0…c1 (kingdoms.js).
  const title = /<title>([^<]*)<\/title>/i.exec(src)?.[1] ?? ''
  const m = /\b([A-C][0-2])\+?\b/i.exec(title)
  const label = m ? m[1].toUpperCase() : ''
  // Путь к файлу — как в соседних ошибках модуля: запускают экстрактор сразу
  // по нескольким --src, и без имени файла непонятно, какой курс не читается.
  if (!label) throw new Error(`в файле курса не найден уровень в <title>: ${filePath}`)
  return { level: label.toLowerCase(), label }
}

function readCourse(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const { level, label } = readLevel(src, filePath)

  // UNITS и REVIEWS могут законно отсутствовать (курс без юнит-тестов) —
  // фиксируем это явным `?? []` / `?? {}`, а не полагаемся на побочный
  // эффект `|| []` внутри evalDecl.
  const rawUnits = evalDecl(src, 'UNITS', filePath) ?? []
  const units = rawUnits.map((u, i) => ({ no: i + 1, name: Array.isArray(u) ? u[0] : String(u) }))

  // LESSONS — обязательное объявление: без уроков курс читать бессмысленно,
  // экстрактор не должен молча опубликовать пустой курс.
  const rawLessons = evalDecl(src, 'LESSONS', filePath)
  if (!rawLessons) throw new Error(`в файле курса не найдено объявление LESSONS: ${filePath}`)
  // Прочитанный курс — данные только для чтения: конвейер несколько раз
  // проходит по одним и тем же урокам и юнит-тестам, и пометки на этих
  // объектах были бы состоянием прохода, живущим в чужом модуле. Заморозка
  // такую запись не даст выполнить: в нестрогом режиме она молча ничего не
  // изменит, в строгом бросит TypeError — в обоих случаях пометка не
  // «приживётся», и код, который на неё понадеялся, сломается на первом же
  // прогоне, а не начнёт молча путать состояние проходов.
  const lessons = Object.keys(rawLessons)
    .map(Number)
    .sort((a, b) => a - b)
    .map((no) => {
      const l = rawLessons[no]
      return Object.freeze({
        no,
        unit: l.unit,
        title: l.title || '',
        blurb: l.blurb || '',
        tracks: l.tracks || {},
        // VOCAB у A0 разложен по режимам, у A1 — плоским списком.
        vocab: Array.isArray(l.VOCAB) ? l.VOCAB : (l.VOCAB && l.VOCAB.self) || [],
        images: l.IMG || {},
        html: l.html || '',
      })
    })

  const rawReviews = evalDecl(src, 'REVIEWS', filePath) ?? {}
  const reviews = Object.keys(rawReviews)
    .map(Number)
    .sort((a, b) => a - b)
    .map((no) => {
      const r = rawReviews[no]
      return Object.freeze({ no, unit: r.unit, title: r.title || '', html: r.html || '' })
    })

  return { level, label, units, lessons, reviews }
}

module.exports = { readDecl, readCourse }
