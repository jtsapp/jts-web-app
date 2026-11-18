'use client'

// Прогресс Видеодиктанта — лучший результат каждого урока { clean, n }: «С первого раза: clean из n».
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace, см. progressStore.js), модуль синка
// `videoDictation`, сведение merge: лучший результат с телефона не перезапишется худшим черновиком ноутбука. Лучше тот,
// у кого больше clean / n, при равенстве — больше n (спека, «Правила сверки»). Если два устройства открыты
// одновременно, запись одного до следующей загрузки затирает другое — тот же компромисс, что у Just to Listen. В
// домашнюю работу раздел не отчитывается: area 'videoDictation' бэкенду неизвестна.

import { VIDEO_DICTATION_KEY as KEY, VIDEO_DICTATION_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

// Адрес урока создаёт бэкенд: латиница из названия, дефис, 5 случайных знаков (как у Шэдоуинга).
const SLUG = /^[A-Za-z0-9][A-Za-z0-9-]{0,119}$/
const MAX_PHRASES = 60

const emptyState = () => ({ best: {} })
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
// Только собственные ключи: урок со slug «constructor» не должен доставать функцию из прототипа.
const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : null)

function normEntry(e) {
  if (!isObj(e)) return null
  const { clean, n } = e
  if (!Number.isInteger(n) || n < 1 || n > MAX_PHRASES) return null
  if (!Number.isInteger(clean) || clean < 0 || clean > n) return null
  return { clean, n }
}

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только записи известной формы.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw) || !isObj(raw.best)) return out
  for (const [slug, e] of Object.entries(raw.best)) {
    const entry = SLUG.test(slug) ? normEntry(e) : null
    if (entry) out.best[slug] = entry
  }
  return out
}

/** Лучше ли результат: больше доля «с первого раза», при равенстве — больше фраз. */
export function isBetterResult(next, best) {
  if (!best) return true
  const a = next.clean * best.n
  const b = best.clean * next.n
  return a > b || (a === b && next.n > best.n)
}

/** Сведение двух копий: по каждому уроку — лучший результат. */
export function mergeVideoDictation(a, b) {
  const x = normalize(a)
  const y = normalize(b)
  const best = { ...x.best }
  for (const [slug, e] of Object.entries(y.best)) if (isBetterResult(e, own(best, slug))) best[slug] = e
  return { best }
}

const store = createProgressStore({
  module: 'videoDictation',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergeVideoDictation(server, local),
})

/** { <slug>: { clean, n } } */
export function readBest() {
  return store.read().best
}

/** Лучший результат урока или null. */
export function bestOf(best, slug) {
  return own(best, slug)
}

/** Записывает результат урока, если он лучше прежнего. true — записан. */
export function recordBest(slug, result) {
  const entry = SLUG.test(String(slug)) ? normEntry(result) : null
  if (!entry) return false
  const state = normalize(store.read())
  if (!isBetterResult(entry, own(state.best, slug))) return false
  state.best[slug] = entry
  store.write(state)
  return true
}
