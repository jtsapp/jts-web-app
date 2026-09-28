// Сборка стенограммы раунда (порт javaTest src/services/speechSegments.ts):
// из того, что намерил микрофон, и того, что написал распознаватель. Чистый
// модуль — ни React, ни браузера. Длительности берутся из времени голоса, а не
// из длины текста.
//
// Форма стенограммы: { utterances, segments }. `utterances` — ответ
// распознавателя как есть, его никто не правит. `segments` — лента во времени
// раунда (секунды): WORD — речь хотя бы с одним словом; FILLER — заминка
// («um» от распознавателя или протяжный звук без текста); NON_WORD_SOUND —
// голос без слов; PAUSE — тишина; UNCLASSIFIED — голос после того, как
// распознавание перестало работать.

import { MIN_HESITATION, MIN_STEADY } from './voiceFeatures.js'

// Секунды. Тишина короче MIN_PAUSE — вдох между словами. Голос короче
// MIN_SOUND без слов не учитываем. Слово приходит не раньше WORD_LAG после
// начала своего голоса; пришедшее через MAX_LAG после конца голоса сказано
// слишком тихо, чтобы его измерить, — его место оценивает LATENCY.
export const MIN_PAUSE = 0.4
export const LONG_PAUSE = 1
export const MIN_SOUND = 0.15
export const WORD_LAG = 0.15
export const MAX_LAG = 3
export const LATENCY = 0.6
// Доля звонких кадров, ниже которой отрезок — шум, а не голос.
export const MIN_VOICING = 0.3
// Протяжные звуки от MIN_HESITATION — заминки где угодно. Короче — только в
// голосе без слов, и только если занимают SHORT_HELD_SHARE его длины.
export const SHORT_HELD_SHARE = 0.4

// Звуки заминки так, как их пишут распознаватели: um, uh, hmm, mhm, er, erm,
// eh, ah, aaa, ooh, huh. Однобуквенные слова вроде «a» остаются словами.
const FILLER = /^(?:u+h*m*|h*m+|m+h+m*|e+(?:r+m*|m+)?|e+h+|a{2,}h*|ah+|o{2,}h*|o+h{2,}|h+u+h+)$/
export const normalise = (chunk) => chunk.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
export const chunks = (text) => text.split(/\s+/).filter(Boolean)

/** Кусок текста между пробелами (с пунктуацией) → { text, kind: WORD|FILLER, repetition }. */
export function tokenize(text) {
  return chunks(text).map((chunk) => {
    const word = normalise(chunk)
    const filler = word !== '' && word.split('-').every((part) => FILLER.test(part))
    return { text: chunk, kind: filler ? 'FILLER' : 'WORD', repetition: false }
  })
}
export const hasWords = (text) => tokenize(text).some((token) => token.kind === 'WORD')

const overlap = (a, b) => Math.min(a.end, b.end) - Math.max(a.start, b.start)

// Отрезки голоса, разрезанные вокруг длинных протяжных звуков; шум отброшен.
function piecesOf(spans, held) {
  const pieces = []
  const piece = (start, end, isHeld) =>
    end > start &&
    pieces.push({
      start,
      end,
      held: isHeld,
      shortHeld:
        !isHeld &&
        held
          .filter((h) => h.end - h.start >= MIN_STEADY)
          .reduce((sum, h) => sum + Math.max(0, overlap(h, { start, end })), 0) >=
          SHORT_HELD_SHARE * (end - start),
      tokens: [],
    })
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    if (span.voicing < MIN_VOICING) continue
    let cursor = span.start
    for (const h of held) {
      if (h.end - h.start < MIN_HESITATION || overlap(h, span) <= 0) continue
      const from = Math.max(h.start, span.start)
      const to = Math.min(h.end, span.end)
      piece(cursor, from, false)
      piece(from, to, true)
      cursor = to
    }
    piece(cursor, span.end, false)
  }
  return pieces
}

// Каждое слово ложится на голос, из которого пришло: на последний отрезок,
// начавшийся за WORD_LAG до прихода слова, и никогда не назад. Словам без
// голоса рядом достаётся оценочный отрезок после отрезка прошлого слова —
// порядок сказанного не меняется никогда.
function placeTokens(pieces, utterances) {
  const voice = pieces.filter((p) => !p.held)
  const estimated = []
  let at = -1
  let lastEnd = 0
  for (const u of utterances) {
    let arrival = -Infinity
    tokenize(u.text).forEach((token, k) => {
      arrival = Math.max(arrival, u.arrivals[k] ?? u.confirmedAt)
      let target = at
      while (target + 1 < voice.length && voice[target + 1].start <= arrival - WORD_LAG) target++
      const piece = voice[Math.max(target, 0)]
      if (!piece || arrival - piece.end > MAX_LAG || piece.start - arrival > MAX_LAG) {
        const last = estimated[estimated.length - 1]
        if (last?.end === lastEnd && arrival - last.end <= MAX_LAG) {
          last.end = Math.max(last.end, arrival - WORD_LAG)
          last.tokens.push(token)
          lastEnd = last.end
        } else {
          const start = Math.max(lastEnd, arrival - LATENCY)
          estimated.push({
            start,
            end: Math.max(start + WORD_LAG, arrival - WORD_LAG),
            held: false,
            shortHeld: false,
            tokens: [token],
          })
          lastEnd = estimated[estimated.length - 1].end
        }
        return
      }
      at = Math.max(target, 0)
      piece.tokens.push(token)
      lastEnd = piece.end
    })
  }
  return estimated
}

const round = (n) => Math.round(n * 100) / 100
const segment = (kind, start, end, tokens = []) => ({
  kind,
  text: tokens.map((t) => t.text).join(' '),
  tokens,
  start,
  end,
})

/**
 * @param spans      отрезки голоса { start, end, voicing }
 * @param held       протяжные звуки { start, end }
 * @param utterances ответы распознавателя { text, confidence, arrivals[], heardAt, confirmedAt }
 * @param end        конец раунда, с
 * @param failedAt   когда отвалилось распознавание (null — работало весь раунд)
 */
export function buildTranscript(spans, held, utterances, end, failedAt) {
  const pieces = piecesOf(spans, held)
  const all = [...pieces, ...placeTokens(pieces, utterances)].sort((a, b) => a.start - b.start)
  const heard = []
  for (const p of all) {
    const previous = heard[heard.length - 1]
    if (p.tokens.length) {
      // Слова, разделённые меньше чем паузой, читаются одним куском речи.
      if (previous?.tokens.length && p.start - previous.end < MIN_PAUSE) {
        previous.tokens.push(...p.tokens)
        previous.end = Math.max(previous.end, p.end)
        previous.text = previous.tokens.map((t) => t.text).join(' ')
        if (p.tokens.some((t) => t.kind === 'WORD')) previous.kind = 'WORD'
      } else heard.push(segment(p.tokens.some((t) => t.kind === 'WORD') ? 'WORD' : 'FILLER', p.start, p.end, p.tokens))
    } else if (p.held || p.shortHeld) heard.push(segment('FILLER', p.start, p.end))
    else if (p.end - p.start >= MIN_SOUND)
      heard.push(segment(failedAt !== null && p.start >= failedAt ? 'UNCLASSIFIED' : 'NON_WORD_SOUND', p.start, p.end))
  }
  // Всё между услышанным — тишина (или шум без голоса).
  const segments = []
  let cursor = 0
  for (const s of [...heard, segment('PAUSE', end, end)]) {
    const start = Math.max(s.start, cursor)
    if (start - cursor >= MIN_PAUSE) segments.push(segment('PAUSE', cursor, start))
    if (s.end > start || s.kind !== 'PAUSE') segments.push({ ...s, start, end: Math.max(start, s.end) })
    cursor = Math.max(cursor, s.end)
  }
  // Отрезки нулевой длины выживают, только если несут слова.
  const timeline = segments
    .filter((s) => s.end > s.start || s.tokens.length)
    .map((s) => ({ ...s, start: round(s.start), end: round(s.end) }))
  markRepetitions(timeline)
  return {
    utterances: utterances.map(({ text, confidence }) => ({ text, confidence })),
    segments: timeline,
  }
}

// Слово, равное предыдущему сказанному (через любые заминки, паузы и звуки), —
// возможный повтор. Он помечается, но никогда не удаляется.
export function markRepetitions(segments) {
  let previous = ''
  for (const s of segments)
    for (const token of s.tokens) {
      if (token.kind === 'FILLER') continue
      const word = normalise(token.text)
      token.repetition = word !== '' && word === previous
      previous = word
    }
}

// Простые счётчики для показа — без суждений о самом языке.
export function summarise(transcript) {
  const totals = { words: 0, hesitations: 0, repetitions: 0, pauses: 0, longPauses: 0, sound: 0 }
  for (const s of transcript.segments) {
    if (s.kind === 'PAUSE') {
      totals.pauses++
      if (s.end - s.start >= LONG_PAUSE) totals.longPauses++
    }
    if (s.kind === 'NON_WORD_SOUND') totals.sound += s.end - s.start
    if (s.kind === 'FILLER' && !s.tokens.length) totals.hesitations++
    for (const t of s.tokens) {
      if (t.kind === 'FILLER') totals.hesitations++
      else totals.words++
      if (t.repetition) totals.repetitions++
    }
  }
  return totals
}

export const emptyTranscript = () => ({ utterances: [], segments: [] })
