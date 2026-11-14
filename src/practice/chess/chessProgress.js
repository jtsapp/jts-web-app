// src/practice/chess/chessProgress.js
'use client'

// Прогресс шахмат: рейтинг ученика, недоигранная партия и последние сыгранные.
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace) со сведением merge в момент
// снимка сервера, как у «Чисел». Текущая партия лежит JSON-СТРОКОЙ, а не объектом: хранилище копит правки
// патчем (statePatch.js), где список — это множество. Журнал часов по ходам (clockLog) — список, в котором
// важны порядок и повторы; патч-множество его бы испортил. Строка же заменяется целиком.
//
// PGN здесь не разбирается (normalize зовётся на каждое чтение): нечитаемую партию отбрасывает экран,
// когда её открывают.
import { CHESS_KEY as KEY, CHESS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'
import { START_RATING, FLOOR } from './rating.js'
import { clampBot } from './strength.js'

export const TIME_OPTIONS = [0, 5, 10, 15]
export const HISTORY_MAX = 50
const RESULTS = ['1-0', '0-1', '1/2-1/2']
const PGN_MAX = 20000

const emptyState = () => ({ rating: START_RATING, games: 0, current: null, history: [] })
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const int = (x, lo, hi, fallback = lo) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : fallback)
const text = (x, max) => (typeof x === 'string' && x.length > 0 && x.length <= max ? x : null)
const pgnOf = (x) => (typeof x === 'string' && x.length <= PGN_MAX ? x : null)
const color = (x) => (x === 'w' || x === 'b' ? x : null)
const clockOf = (c) => (isObj(c) && Number.isFinite(c.w) && Number.isFinite(c.b) ? { w: Math.max(0, c.w), b: Math.max(0, c.b) } : null)

function normCurrent(c) {
  if (!isObj(c)) return null
  const id = text(c.id, 40)
  const pgn = pgnOf(c.pgn)
  if (!id || pgn === null || !color(c.color)) return null
  const time = TIME_OPTIONS.includes(c.time) ? c.time : 0
  const clock = time ? clockOf(c.clock) : null
  return {
    id, startedAt: int(c.startedAt, 0, 1e15), movedAt: int(c.movedAt, 0, 1e15), color: c.color,
    botRating: clampBot(c.botRating), time: clock ? time : 0, pgn, clock,
    clockLog: clock && Array.isArray(c.clockLog) ? c.clockLog.map(clockOf).filter(Boolean).slice(0, 1200) : [],
    usedUndo: c.usedUndo === true, usedHint: c.usedHint === true,
  }
}

function normRecord(r) {
  if (!isObj(r)) return null
  const id = text(r.id, 40)
  const pgn = pgnOf(r.pgn)
  if (!id || !pgn || !color(r.color) || !RESULTS.includes(r.result)) return null
  return {
    id, endedAt: int(r.endedAt, 0, 1e15), color: r.color, botRating: clampBot(r.botRating),
    time: TIME_OPTIONS.includes(r.time) ? r.time : 0, result: r.result, reason: text(r.reason, 24) || 'checkmate', pgn,
    rated: r.rated === true, ratingBefore: int(r.ratingBefore, FLOOR, 4000, START_RATING), ratingAfter: int(r.ratingAfter, FLOOR, 4000, START_RATING),
  }
}

function parseCurrent(raw) {
  if (typeof raw !== 'string') return null
  try { return normCurrent(JSON.parse(raw)) } catch { return null }
}

/** Текущая партия объектом — или null, если её нет. */
export const currentOf = (state) => parseCurrent(state?.current)

export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw)) return out
  out.rating = int(raw.rating, FLOOR, 4000, START_RATING)
  out.games = int(raw.games, 0, 1e6)
  const current = parseCurrent(raw.current)
  out.current = current ? JSON.stringify(current) : null
  if (Array.isArray(raw.history)) {
    const byId = new Map()
    for (const r of raw.history.map(normRecord)) if (r && !byId.has(r.id)) byId.set(r.id, r)
    out.history = [...byId.values()].sort((a, b) => b.endedAt - a.endedAt).slice(0, HISTORY_MAX)
  }
  return out
}

/** Сведение двух копий: сыгранное где угодно — в истории; рейтинг — у копии, где партий больше. */
export function mergeChess(server, local) {
  const a = normalize(server)
  const b = normalize(local)
  const lead = b.games > a.games ? b : a
  const history = normalize({ history: [...a.history, ...b.history] }).history
  const ca = parseCurrent(a.current)
  const cb = parseCurrent(b.current)
  let current = !ca ? cb : !cb ? ca : cb.movedAt > ca.movedAt ? cb : ca
  // Партия, доигранная на другом устройстве, не должна вернуться недоигранной.
  if (current && history.some((r) => r.id === current.id)) current = null
  return { rating: lead.rating, games: lead.games, current: current ? JSON.stringify(current) : null, history }
}

const store = createProgressStore({
  module: 'chess',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergeChess(server, local),
})

export function readChess() {
  return store.read()
}

// Читать-менять-писать по свежему состоянию: снимок сервера мог приехать посреди партии.
function update(fn) {
  const next = normalize(JSON.parse(JSON.stringify(store.read())))
  fn(next)
  store.write(normalize(next))
}

export function saveCurrent(current) {
  update((s) => { s.current = current ? JSON.stringify(current) : null })
}

export function recordGame(record) {
  update((s) => {
    s.history = [record, ...s.history.filter((r) => r.id !== record.id)]
    s.games += 1
    if (record.rated) s.rating = record.ratingAfter
    s.current = null
  })
}
