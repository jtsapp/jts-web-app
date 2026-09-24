// Время песни → что показывать на экране исполнения: какая строка в центре,
// какое слово поётся, сколько строк уже позади. Чистый модуль без DOM — всё,
// что экран выводит из позиции трека, живёт здесь и покрыто тестами.

import { normalizeWords } from './scoring.js'

export function fmtTime(sec) {
  if (!Number.isFinite(sec)) return '0:00'
  const s = Math.floor(Math.abs(sec) % 60)
  const m = Math.floor(Math.abs(sec) / 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Строка, звучащая в момент `t`. Возвращает индекс или -1 (пауза). */
export function lineAt(lines, t) {
  for (let i = 0; i < lines.length; i++) {
    if (t < lines[i].start) return -1
    if (t <= lines[i].end) return i
  }
  return -1
}

/** Ближайшая следующая строка, -1 — если впереди строк нет. */
export function nextLineIndex(lines, t) {
  for (let i = 0; i < lines.length; i++) if (lines[i].start > t) return i
  return -1
}

/**
 * Строка в центре экрана: звучащая, а в проигрыше — следующая.
 *
 * Центр не пустеет в паузах намеренно: крупная строка, которая вот-вот
 * начнётся, и есть подсказка «вступай», а пустое место посреди экрана
 * читалось бы как «трек сломался». После последней строки держим последнюю.
 */
export function focusLineIndex(lines, t) {
  if (!lines.length) return -1
  const i = lineAt(lines, t)
  if (i >= 0) return i
  const next = nextLineIndex(lines, t)
  return next >= 0 ? next : lines.length - 1
}

/**
 * Слова строки с моментами их начала.
 *
 * Пословные таймкоды в разметке необязательны (контракт §3). Без них делим
 * строку по длине слов: длинное слово поётся дольше, и такая оценка ближе к
 * песне, чем «поровну на слово». Подсветка от этого остаётся пословной, как в
 * макете, а не превращается в заливку по буквам.
 */
export function wordTimes(line) {
  if (line.words?.length) return line.words.map((w) => ({ w: w.w, t: w.t }))
  const parts = String(line.text || '').split(/\s+/).filter(Boolean)
  const total = parts.reduce((sum, p) => sum + p.length, 0) || 1
  const span = Math.max(0, line.end - line.start)
  let acc = 0
  return parts.map((p) => {
    const t = line.start + (acc / total) * span
    acc += p.length
    return { w: p, t }
  })
}

/**
 * Индекс слова, которое поётся в момент `t`: последнее начавшееся.
 * -1 — строка ещё не началась, words.length — строка уже спета целиком.
 */
export function activeWordIndex(words, line, t) {
  if (t < line.start) return -1
  if (t > line.end) return words.length
  let k = -1
  for (let i = 0; i < words.length; i++) if (words[i].t <= t) k = i
  return k
}

/** Сколько строк уже позади — для «Спето 9 строк из 32» на паузе. */
export function linesPassed(lines, t) {
  let n = 0
  for (const l of lines) if (l.end <= t) n++
  return n
}

/**
 * Строка → куски для подсветки «сложного слова»: `[{ text, hard }]`.
 *
 * Слово ищем по нормализованной форме, как его сравнивало распознавание:
 * в строке стоит «Monday,», а в списке пропущенных — «monday». Подчёркиваем
 * только само слово, без запятой рядом, — как в макете.
 */
export function splitHard(text, token) {
  const src = String(text || '')
  if (!token) return [{ text: src, hard: false }]
  const out = []
  const push = (s, hard) => {
    if (!s) return
    const last = out[out.length - 1]
    if (last && !last.hard && !hard) last.text += s
    else out.push({ text: s, hard })
  }
  let found = false
  for (const piece of src.split(/(\s+)/)) {
    if (!found && piece.trim() && normalizeWords(piece).includes(token)) {
      const m = piece.match(/^([^\p{L}\p{N}'’]*)(.*?)([^\p{L}\p{N}'’]*)$/u)
      push(m[1], false)
      push(m[2], true)
      push(m[3], false)
      found = true
    } else {
      push(piece, false)
    }
  }
  return out
}
