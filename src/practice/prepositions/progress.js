'use client'

// Прогресс Prepositions World: какие уроки прочитаны (открывают их практику) и
// лучший результат каждого набора (урок, категория, финал). Форма и ключ — как
// у прототипа, только без его localStorage.
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge: урок, прочитанный на телефоне, не
// «распрочитывается» черновиком ноутбука, лучший результат берётся с любого
// устройства. Движок читает перед каждым экраном (readPrepositions — копия:
// движок её меняет) и пишет целиком.
//
// Домашней работой раздел не отчитывается: area 'prepositions' бэкенду неизвестна.

import { PREPOSITIONS_KEY as KEY, PREPOSITIONS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

const SCORE_KEY = /^(L:.+|C:.+|F)$/
const emptyState = () => ({ done: {}, score: {} })
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const num = (x, lo, hi) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo)

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только
// то, что похоже на прогресс известной формы.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw)) return out
  if (isObj(raw.done)) for (const [id, v] of Object.entries(raw.done)) if (id && id.length <= 120 && v) out.done[id] = 1
  if (isObj(raw.score)) {
    for (const [k, s] of Object.entries(raw.score)) {
      if (SCORE_KEY.test(k) && k.length <= 130 && isObj(s)) out.score[k] = { best: num(s.best, 0, 1), stars: Math.round(num(s.stars, 0, 3)) }
    }
  }
  return out
}

/** Сведение двух копий: прочитанное где угодно — прочитано; доля и звёзды — максимум. */
export function mergePrepositions(a, b) {
  a = normalize(a)
  b = normalize(b)
  const out = { done: { ...a.done, ...b.done }, score: { ...a.score } }
  for (const [k, s] of Object.entries(b.score)) {
    const x = out.score[k]
    out.score[k] = x ? { best: Math.max(x.best, s.best), stars: Math.max(x.stars, s.stars) } : s
  }
  return out
}

const store = createProgressStore({
  module: 'prepositions',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergePrepositions(server, local),
})

export function readPrepositions() {
  return normalize(JSON.parse(JSON.stringify(store.read())))
}

export function writePrepositions(state) {
  store.write(normalize(state))
}
