'use client'

// Прогресс Cartoon World: ответы ученика по ходам миссий, «пройдено» и время
// последней правки. Форма — как у прототипа (missions[id] = {turns, done, at}),
// только без его localStorage и без черновика: черновик ответа — устройство
// (CARTOONS_DRAFTS_KEY, движок держит его сам), недописанный текст на другое
// устройство не везём.
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge в момент снимка сервера: миссия,
// пройденная на телефоне, не «распроходится» ноутбуком; ходы берутся у копии с
// более поздней правкой (u). Движок читает перед каждым шагом и пишет через
// updateCartoons — читать-менять-писать по свежему состоянию.
//
// Домашней работой раздел не отчитывается: area 'cartoons' бэкенду неизвестна.

import { CARTOONS_KEY as KEY, CARTOONS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

const MAX_TURNS = 20
const MAX_TEXT = 4000
const ID = /^[A-Za-z0-9_-]{1,80}$/
const emptyState = () => ({ missions: {} })
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const num = (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.round(x) : 0)

function normTurn(t) {
  if (!isObj(t) || typeof t.t !== 'string') return null
  return { t: t.t.slice(0, MAX_TEXT), p: Number.isInteger(t.p) ? t.p : -1, w: typeof t.w === 'string' ? t.w.slice(0, 80) : '' }
}

function normMission(m) {
  const turns = Array.isArray(m.turns) ? m.turns.slice(0, MAX_TURNS).map(normTurn).filter(Boolean) : []
  const out = { turns }
  if (m.done === true) out.done = true
  if (num(m.at)) out.at = num(m.at)
  if (num(m.u)) out.u = num(m.u)
  return out
}

export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw) || !isObj(raw.missions)) return out
  for (const [id, m] of Object.entries(raw.missions)) if (ID.test(id) && isObj(m)) out.missions[id] = normMission(m)
  return out
}

/** Сведение двух копий: «пройдено» — ИЛИ; ходы — у копии с более поздней правкой. */
export function mergeCartoons(a, b) {
  a = normalize(a)
  b = normalize(b)
  const out = emptyState()
  for (const id of new Set([...Object.keys(a.missions), ...Object.keys(b.missions)])) {
    const x = a.missions[id]
    const y = b.missions[id]
    if (!x || !y) {
      out.missions[id] = x || y
      continue
    }
    const fresh = (y.u || 0) > (x.u || 0) ? y : x
    const m = { ...fresh, turns: fresh.turns.slice() }
    if (x.done || y.done) {
      m.done = true
      m.at = Math.max(x.at || 0, y.at || 0) || undefined
      if (!m.at) delete m.at
    }
    out.missions[id] = m
  }
  return out
}

const store = createProgressStore({
  module: 'cartoons',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergeCartoons(server, local),
})

export function readCartoons() {
  return normalize(JSON.parse(JSON.stringify(store.read())))
}

/** Читать-менять-писать по свежему состоянию: fn получает копию и меняет её. */
export function updateCartoons(fn) {
  const next = readCartoons()
  fn(next)
  store.write(normalize(next))
}
