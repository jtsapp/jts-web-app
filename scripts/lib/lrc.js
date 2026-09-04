// LRC → разметка караоке.
//
// LRC — то, в чём таймкоды размечают все: его отдают LRC-редакторы, Audacity
// через экспорт меток, и в нём же приходит материал со стороны. Формат наш
// (docs/superpowers/specs/2026-09-03-karaoke-api-contract.md §3) устроен богаче,
// но руками его не пишут — пишут строки со временем, а остальное выводится.
//
// Здесь только разбор и сборка; проверка результата — не своя, а та же самая,
// что в плеере (`normalizeLyrics` из src/practice/karaoke/karaokeShape.js).
// Третьей копии правил в проекте быть не должно.

/** `[mm:ss.xx]` / `[mm:ss.xxx]` / `[mm:ss]` — метка времени строки. */
const TIME_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g
/** `<mm:ss.xx>` — пословная метка расширенного LRC. */
const WORD_TAG = /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>/g
/** `[ti:…]`, `[ar:…]`, `[offset:+250]` — метаданные файла. */
const META_TAG = /^\[([a-z]{2,10}):(.*)\]$/i

function toSeconds(mm, ss, frac) {
  let sec = Number(mm) * 60 + Number(ss)
  if (frac != null) {
    // «.5» — это полсекунды, «.50» — тоже, «.500» — снова. Дополняем до
    // миллисекунд, иначе двузначная сотая читалась бы как миллисекунды.
    sec += Number(frac.padEnd(3, '0')) / 1000
  }
  return Math.round(sec * 1000) / 1000
}

/**
 * Разбирает LRC.
 *
 * Возвращает `{ meta, entries }`, где entry — это `{ start, text, words }`.
 * Пустой текст — не мусор, а маркер конца предыдущей строки: так в LRC
 * помечают паузу, и без него последняя строка куплета тянулась бы до начала
 * следующего.
 */
export function parseLrc(text) {
  const meta = {}
  const entries = []

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const metaMatch = line.match(META_TAG)
    if (metaMatch && !/^\d/.test(metaMatch[1])) {
      meta[metaMatch[1].toLowerCase()] = metaMatch[2].trim()
      continue
    }

    TIME_TAG.lastIndex = 0
    const starts = []
    let match
    let bodyFrom = 0
    while ((match = TIME_TAG.exec(line)) !== null) {
      // Метки идут только в начале строки; встретили текст — дальше уже текст.
      if (match.index !== bodyFrom) break
      starts.push(toSeconds(match[1], match[2], match[3]))
      bodyFrom = TIME_TAG.lastIndex
    }
    if (starts.length === 0) continue

    const body = line.slice(bodyFrom)
    const words = []
    WORD_TAG.lastIndex = 0
    let plain = body
    if (WORD_TAG.test(body)) {
      WORD_TAG.lastIndex = 0
      let last = null
      let cursor = 0
      let m
      while ((m = WORD_TAG.exec(body)) !== null) {
        if (last) {
          const w = body.slice(cursor, m.index).trim()
          if (w) words.push({ w, t: last })
        }
        last = toSeconds(m[1], m[2], m[3])
        cursor = WORD_TAG.lastIndex
      }
      if (last != null) {
        const tail = body.slice(cursor).trim()
        if (tail) words.push({ w: tail, t: last })
      }
      plain = body.replace(WORD_TAG, ' ')
    }

    const clean = plain.replace(/\s+/g, ' ').trim()
    // Одна и та же строка может быть помечена несколькими временами (припев) —
    // разворачиваем её в отдельные строки, иначе повтор потеряется.
    for (const start of starts) {
      entries.push({ start, text: clean, words: starts.length === 1 ? words : [] })
    }
  }

  entries.sort((a, b) => a.start - b.start)
  return { meta, entries }
}

/**
 * Собирает документ разметки.
 *
 * @param {object} opts
 * @param {string} opts.lrc            содержимое .lrc
 * @param {number} opts.duration       длительность фонограммы в секундах
 * @param {string[]} [opts.ru]         переводы строк, по строке на строку
 * @param {{w:string,ru?:string,line?:number}[]} [opts.vocab]
 * @param {string} [opts.slug]
 * @param {number} [opts.maxLineSec]   потолок длительности строки (по умолчанию 12)
 */
export function buildLyrics({ lrc, duration, ru = [], vocab = [], slug, maxLineSec = 12 }) {
  const { meta, entries } = parseLrc(lrc)
  // offset в LRC — это сдвиг воспроизведения в миллисекундах, причём с обратным
  // знаком: положительный означает «показывать раньше».
  const offset = Number(meta.offset || 0) / 1000
  const shifted = entries.map((e) => ({
    ...e,
    start: Math.max(0, Math.round((e.start - offset) * 1000) / 1000),
    words: e.words.map((w) => ({ ...w, t: Math.max(0, Math.round((w.t - offset) * 1000) / 1000) })),
  }))

  const sung = shifted.filter((e) => e.text)
  if (sung.length === 0) {
    throw new Error('В LRC нет ни одной строки с текстом')
  }
  if (ru.length && ru.length !== sung.length) {
    throw new Error(`Переводов ${ru.length}, а строк ${sung.length} — должно совпадать`)
  }

  const lines = sung.map((entry, i) => {
    // Конец строки — начало следующей записи, включая пустые маркеры пауз.
    const nextStart = nextBoundary(shifted, entry, duration)
    const end = Math.min(nextStart, entry.start + maxLineSec, duration || nextStart)
    const line = {
      id: i + 1,
      start: round(entry.start),
      end: round(Math.max(entry.start + 0.3, end)),
      text: entry.text,
    }
    if (ru[i]) line.ru = ru[i]
    if (entry.words.length) {
      line.words = entry.words
        .filter((w) => w.t >= line.start && w.t <= line.end)
        .map((w) => ({ w: w.w, t: round(w.t) }))
      if (!line.words.length) delete line.words
    }
    return line
  })

  const doc = {
    version: 1,
    duration: round(duration || lines[lines.length - 1].end),
    lines,
  }
  if (slug) doc.slug = slug
  if (meta.ti) doc.title = meta.ti
  if (meta.ar) doc.artist = meta.ar

  const words = resolveVocab(vocab, lines)
  if (words.length) doc.vocab = words

  return doc
}

function nextBoundary(all, entry, duration) {
  const index = all.indexOf(entry)
  for (let i = index + 1; i < all.length; i++) {
    if (all[i].start > entry.start) return all[i].start
  }
  return duration || entry.start + 4
}

function round(n) {
  return Math.round(n * 100) / 100
}

/**
 * Привязывает слова словаря к строкам.
 *
 * Номер строки можно задать руками; если не задан — ищем первое вхождение по
 * границе слова. Не нашли — слово всё равно оставляем: Warm-up покажет его без
 * фрагмента песни, это лучше, чем молча потерять.
 */
function resolveVocab(vocab, lines) {
  return vocab
    .filter((v) => v && String(v.w || '').trim())
    .map((v) => {
      const word = String(v.w).trim()
      let line = Number(v.line) || null
      if (!line) {
        const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        const hit = lines.find((l) => re.test(l.text))
        line = hit ? hit.id : null
      }
      const out = { w: word }
      if (v.ru) out.ru = String(v.ru).trim()
      if (line) out.line = line
      return out
    })
}

/** Слот скелета: метка времени и номер `#N` вместо текста. */
const SLOT = /^(\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])\s*#(\d+)\s*$/

/**
 * Подставляет текст в скелет таймингов.
 *
 * Скелет снимается из фонограммы (см. README раздела) и содержит только время:
 * `[00:08.52] #1`. Текст живёт отдельным файлом и попадает в разметку здесь —
 * так тайминги можно снять машинно, а слова взять из источника, который есть у
 * методиста.
 *
 * Уже заполненные строки не трогаем: скелет правят руками, и повторный прогон
 * не должен затирать эту работу.
 */
export function fillSkeleton(lrc, texts) {
  const lines = String(lrc).split(/\r?\n/)
  const slots = []
  lines.forEach((line, i) => {
    if (SLOT.test(line.trim())) slots.push(i)
  })
  if (slots.length === 0) {
    throw new Error('В скелете нет слотов вида «[00:08.52] #1» — нечего заполнять')
  }
  if (slots.length !== texts.length) {
    throw new Error(
      `Строк в тексте ${texts.length}, а слотов в скелете ${slots.length}. ` +
        'Склей лишние тайминги (удали строку со слотом) или разбей строку текста.',
    )
  }
  slots.forEach((at, i) => {
    const [, tag] = lines[at].trim().match(SLOT)
    lines[at] = `${tag}${texts[i]}`
  })
  return lines.join('\n')
}

/**
 * Читает файл с текстом песни: по строке на строку.
 *
 * Заголовки разделов (`[Verse 1]`, `[Chorus]`) выбрасываем — их поют не они, а
 * в текст их вставляет любой лирик-сайт.
 */
export function parseTextFile(text) {
  return String(text)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !/^\[.*\]$/.test(s))
}

/** Разбирает файл словаря: `слово = перевод` и необязательное `@ номер строки`. */
export function parseVocabFile(text) {
  return String(text)
    .split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter((raw) => raw && !raw.startsWith('#'))
    .map((raw) => {
      const at = raw.match(/@\s*(\d+)\s*$/)
      const body = at ? raw.slice(0, at.index).trim() : raw
      const [w, ru] = body.split('=').map((s) => (s || '').trim())
      return { w, ru: ru || undefined, line: at ? Number(at[1]) : undefined }
    })
    .filter((v) => v.w)
}
