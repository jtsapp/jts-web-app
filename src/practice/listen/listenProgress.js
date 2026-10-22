'use client'

// Прогресс Just to Listen — лучший результат каждого прогона (часть урока,
// повторение, тест). По нему считаются «пройдено уроков» в меню и монеты в
// баланс: начисляется только прирост к лучшему (rules.js, coinsToCredit).
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge: лучший результат, полученный на
// телефоне, не перезапишется худшим черновиком ноутбука. Если два устройства
// открыты одновременно, запись одного до следующей загрузки затирает другое —
// тот же компромисс, что у «Чисел». В домашнюю работу раздел не отчитывается:
// area 'listen' бэкенду неизвестна.

import { LISTEN_KEY as KEY, LISTEN_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'
import { isBetter } from './rules.js'

const RUN_KEY = /^[A-Za-z0-9_-]{1,32}-(?:T|U\d{1,3}|L\d{1,3}-(?:R|\d{1,3}))$/
const MAX = 1e6

const emptyState = () => ({ best: {} })
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const count = (x) => (Number.isInteger(x) && x >= 0 && x <= MAX ? x : null)

function normEntry(e) {
  if (!isObj(e)) return null
  const ok = count(e.ok)
  const n = count(e.n)
  const coins = count(e.coins)
  if (ok === null || n === null || coins === null || n === 0 || ok > n) return null
  return { ok, n, coins }
}

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только
// записи известной формы.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw) || !isObj(raw.best)) return out
  for (const [key, e] of Object.entries(raw.best)) {
    const entry = RUN_KEY.test(key) ? normEntry(e) : null
    if (entry) out.best[key] = entry
  }
  return out
}

/** Сведение двух копий: по каждому прогону — лучший результат. */
export function mergeListen(a, b) {
  const x = normalize(a)
  const y = normalize(b)
  const best = { ...x.best }
  for (const [key, e] of Object.entries(y.best)) if (isBetter(e, best[key])) best[key] = e
  return { best }
}

const store = createProgressStore({
  module: 'listen',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergeListen(server, local),
})

export function readBest() {
  return store.read().best
}

/** Записывает результат, если он лучше прежнего. true — записан. */
export function recordBest(key, result) {
  const entry = RUN_KEY.test(key) ? normEntry(result) : null
  if (!entry) return false
  const state = normalize(store.read())
  if (!isBetter(entry, state.best[key])) return false
  state.best[key] = entry
  store.write(state)
  return true
}

/** Сколько уроков набора пройдено: у урока есть результат хотя бы одной части. */
export function doneLessons(best, setId) {
  const prefix = `${setId}-`
  const lessons = new Set()
  for (const key of Object.keys(best)) {
    if (!key.startsWith(prefix)) continue
    const m = /^L(\d+)-\d+$/.exec(key.slice(prefix.length))
    if (m) lessons.add(m[1])
  }
  return lessons.size
}
