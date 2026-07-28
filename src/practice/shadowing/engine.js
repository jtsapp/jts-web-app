// Чистые функции движка Shadowing (без DOM, localStorage и сети). Перенесены
// из standalone-тренажёра shadowing.html: логику парсинга субтитров не меняли —
// только вынесли из IIFE, убрали работу с DOM и оформили ES-модулем. Держим
// отдельно от экрана, чтобы парсер и утилиты можно было юнит-тестировать.

// YouTube-id из полной ссылки или из самого id (ровно 11 символов).
export function ytId(v) {
  v = (v || '').trim()
  const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v
  return ''
}

// Секунды → «м:сс» (тайм-код фразы в списке скрипта).
export function fmt(s) {
  s = Math.max(0, Math.floor(s))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

// Округление до сотых — тайминги субтитров держим компактными.
export function r2(n) {
  return Math.round(n * 100) / 100
}

// Стабильный id фразы для учёта прогресса: sg_000, v2_014, … Индекс дополняем
// нулями, чтобы id не «съезжали» и сортировались лексикографически.
export function segmentId(lessonId, index) {
  return `${lessonId}_${String(index).padStart(3, '0')}`
}

// Чистка текста реплики: html-теги, служебные [скобки-пометки], сущности,
// схлопывание пробелов. Тот же набор замен, что в исходнике.
export function clean(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]{0,24}\]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

// Парсер субтитров: понимает SRT, VTT и панель «Показать текст видео» YouTube.
// Возвращает [[start, end, text], …] со склейкой реплик в предложения. Нужен
// только для авторского режима (?dev=1) — тайминги уроков уже выверены и лежат
// в lessons.js; здесь парсер сохранён, чтобы можно было пересобрать урок.
export function parseCaptions(raw) {
  if (!raw || !raw.trim()) return []
  let lines = raw.replace(/\r/g, '').split('\n')

  // Формат «0:1313 secondsТекст…» / «1:021 minute, 2 secondsТекст…» и
  // навигационные строки «Chapter 2: …», дублирующие текст.
  const INLINE = /^\s*(\d{1,2}:\d{2})(?:\d+\s+minutes?,\s*)?\d+\s+seconds?(.*)$/
  const DURONLY = /^\s*(?:\d+\s+minutes?,?\s*)?\d+\s+seconds?\s*$/i
  const norm = []
  for (const ln of lines) {
    if (/^\s*Chapter\s+\d+\s*:/i.test(ln)) continue
    if (DURONLY.test(ln)) continue // «18 seconds» отдельной строкой — не текст
    if (/ALL RIGHTS RESERVED|^\s*©/i.test(ln)) continue // водяной знак источника
    const m = ln.match(INLINE)
    if (m) {
      norm.push(m[1])
      if (m[2].trim()) norm.push(m[2].trim())
    } else norm.push(ln)
  }
  lines = norm

  const cues = []
  const RANGE = /(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}/
  const STAMP = /^\s*((\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?\s*$/

  function toSec(str) {
    const p = str.trim().split(':')
    let s = 0
    const nums = p.map(parseFloat)
    for (let i = 0; i < nums.length; i++) s = s * 60 + (isNaN(nums[i]) ? 0 : nums[i])
    return s
  }

  // YouTube иногда отдаёт первую фразу без метки — считаем её началом (0:00).
  let first = -1
  for (let i = 0; i < lines.length; i++) {
    if (RANGE.test(lines[i]) || STAMP.test(lines[i])) {
      first = i
      break
    }
  }
  if (
    first > 0 &&
    !RANGE.test(lines[first]) &&
    lines.slice(0, first).some((l) => l.trim() && !/^WEBVTT/i.test(l))
  ) {
    lines.unshift('0:00')
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    if (RANGE.test(ln)) {
      // SRT / VTT
      const m = ln.match(
        /((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})/,
      )
      const buf = []
      let j = i + 1
      while (
        j < lines.length &&
        lines[j].trim() &&
        !RANGE.test(lines[j]) &&
        !/^\d+$/.test(lines[j].trim())
      ) {
        buf.push(lines[j].trim())
        j++
      }
      const txt = clean(buf.join(' '))
      if (txt) cues.push({ s: toSec(m[1]), e: toSec(m[2]), t: txt })
      i = j - 1
    } else if (STAMP.test(ln)) {
      // Панель транскрипта YouTube
      const buf = []
      let j = i + 1
      while (j < lines.length && !STAMP.test(lines[j])) {
        if (lines[j].trim()) buf.push(lines[j].trim())
        j++
      }
      const txt = clean(buf.join(' '))
      if (txt) cues.push({ s: toSec(ln), e: null, t: txt })
      i = j - 1
    }
  }
  if (!cues.length) return []

  // Закрыть незаданные концы.
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].e == null) cues[i].e = i + 1 < cues.length ? cues[i + 1].s : cues[i].s + 4
    if (cues[i].e <= cues[i].s) cues[i].e = cues[i].s + 1.2
  }
  // Убрать дубли (автосубтитры повторяют строки).
  const uniq = []
  for (const c of cues) {
    const p = uniq[uniq.length - 1]
    if (p && p.t === c.t) {
      p.e = Math.max(p.e, c.e)
      continue
    }
    uniq.push(c)
  }

  // Склейка реплик в предложения.
  const out = []
  let cur = null
  for (const c of uniq) {
    if (!cur) cur = { s: c.s, e: c.e, t: c.t }
    else {
      cur.t = (cur.t + ' ' + c.t).replace(/\s+/g, ' ')
      cur.e = c.e
    }
    const ends = /[.!?…]["')\]]?\s*$/.test(cur.t)
    const long = cur.e - cur.s >= 11 || cur.t.length > 190
    if (ends || long) {
      out.push([r2(cur.s), r2(cur.e), cur.t.trim()])
      cur = null
    }
  }
  if (cur) out.push([r2(cur.s), r2(cur.e), cur.t.trim()])
  return out.filter((x) => x[2].length > 1)
}
