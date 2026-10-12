'use client'

// Прогресс «Чисел» (Dexter's Number World): раунды разделов, лучший результат,
// звёзды и «уже было» у боссов и Lab (по нему выбор заданий предпочитает
// непоказанные). Форма — как у прототипа, только без его localStorage.
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge. Сводит хранилище в момент, когда
// приходит снимок сервера (загрузка, вход): раунд, пройденный на телефоне, не
// «распроходится» черновиком ноутбука, где его ещё нет, — пройденное где угодно
// остаётся пройденным. Пока снимка нет, запись не уходит вовсе — уйдёт сведённой.
// После снимка запись уходит как есть (replace): если два устройства открыты
// одновременно, раунд, пройденный на одном, другое затрёт своей записью до
// следующей загрузки, — тот же компромисс, что у остальных разделов-объектов.
//
// Движок не держит у себя копию: читает перед каждым экраном и пишет через
// updateNumbers — читать-менять-писать по свежему состоянию, иначе снимок,
// приехавший посреди раунда, затёрся бы копией, взятой до него.
//
// Домашней работой раздел не отчитывается: area 'numbers' бэкенду неизвестна.

import { NUMBERS_KEY as KEY, NUMBERS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'
import { MAX_ROUNDS, SECTION_ID } from './logic.js'

const emptyState = () => ({ sections: {}, bestCombo: 0, totalCorrect: 0, seen: {} })
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const num = (x, lo, hi) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo)
const int = (x, hi) => Math.round(num(x, 0, hi))

function normRound(r) {
  if (!isObj(r)) return null
  return { passed: r.passed === true, best: num(r.best, 0, 1), stars: int(r.stars, 3), plays: int(r.plays, 1e6) }
}

function normSection(s) {
  return {
    rounds: Array.isArray(s.rounds) ? s.rounds.slice(0, MAX_ROUNDS).map(normRound) : [],
    stars: int(s.stars, 3),
    best: num(s.best, 0, 1),
    bestCr: int(s.bestCr, 1e6),
    done: s.done === true,
    plays: int(s.plays, 1e6),
  }
}

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только
// то, что похоже на прогресс известной формы.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw)) return out
  if (isObj(raw.sections)) {
    for (const [id, s] of Object.entries(raw.sections)) if (SECTION_ID.test(id) && isObj(s)) out.sections[id] = normSection(s)
  }
  out.bestCombo = int(raw.bestCombo, 1e6)
  out.totalCorrect = int(raw.totalCorrect, 1e9)
  if (isObj(raw.seen)) {
    for (const [id, m] of Object.entries(raw.seen)) {
      if (!SECTION_ID.test(id) || !isObj(m)) continue
      const keep = {}
      for (const [k, v] of Object.entries(m)) if (k && k.length <= 300) keep[k] = int(v, 1e6)
      out.seen[id] = keep
    }
  }
  return out
}

const maxRound = (a, b) => (!a ? b : !b ? a : {
  passed: a.passed || b.passed,
  best: Math.max(a.best, b.best),
  stars: Math.max(a.stars, b.stars),
  plays: Math.max(a.plays, b.plays),
})

/**
 * Сведение двух копий: пройденное где угодно — пройдено; лучший результат,
 * звёзды, число игр, рекорды и «уже было» — максимум.
 */
export function mergeNumbers(a, b) {
  a = normalize(a); b = normalize(b)
  const out = emptyState()
  for (const id of new Set([...Object.keys(a.sections), ...Object.keys(b.sections)])) {
    const x = a.sections[id], y = b.sections[id]
    if (!x || !y) { out.sections[id] = x || y; continue }
    const n = Math.max(x.rounds.length, y.rounds.length)
    out.sections[id] = {
      rounds: Array.from({ length: n }, (_, i) => maxRound(x.rounds[i], y.rounds[i]) || null),
      stars: Math.max(x.stars, y.stars),
      best: Math.max(x.best, y.best),
      bestCr: Math.max(x.bestCr, y.bestCr),
      done: x.done || y.done,
      plays: Math.max(x.plays, y.plays),
    }
  }
  out.bestCombo = Math.max(a.bestCombo, b.bestCombo)
  out.totalCorrect = Math.max(a.totalCorrect, b.totalCorrect)
  for (const id of new Set([...Object.keys(a.seen), ...Object.keys(b.seen)])) {
    const m = { ...(a.seen[id] || {}) }
    for (const [k, v] of Object.entries(b.seen[id] || {})) m[k] = Math.max(m[k] || 0, v)
    out.seen[id] = m
  }
  return out
}

const store = createProgressStore({
  module: 'numbers',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergeNumbers(server, local),
})

export function readNumbers() {
  return store.read()
}

/** Читать-менять-писать по свежему состоянию: fn получает копию и меняет её. */
export function updateNumbers(fn) {
  const next = normalize(JSON.parse(JSON.stringify(store.read())))
  fn(next)
  store.write(normalize(next))
}
