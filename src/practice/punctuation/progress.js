'use client'

// Прогресс Punctuation World: прочитанные страницы (read: { <страница>: 1 }),
// звёзды приключения страницы (p: { <страница>: 1–3 }) и fin (у прототипа —
// звёзды финала, этим движком не ставятся, но входят в счёт звёзд шапки).
// Ключ — прототипа (pw-world-1), форма — его же без настроек вида: перевод,
// звук и Луна (tr, mute, luna) и недоигранное приключение (run) живут на
// устройстве (device.js).
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge в момент снимка сервера, как у
// Pronunciation World: страница, прочитанная на телефоне, не
// «распрочитывается» черновиком ноутбука, звёзды — лучшие с любого устройства.
//
// Домашней работой раздел не отчитывается: area 'punctuation' бэкенду неизвестна.

import { PUNCTUATION_KEY as KEY, PUNCTUATION_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

const PAGE = /^\d{1,3}$/
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
// Звёзды — целые 1–3: так их ставит итог приключения (≥ 90 % с первого раза — 3, ≥ 70 % — 2, иначе 1).
const stars = (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 1 ? Math.min(3, Math.floor(x)) : 0)

const emptyState = () => ({ read: {}, p: {}, fin: 0 })

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только то, что похоже на прогресс.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw)) return out
  if (isObj(raw.read)) for (const [id, v] of Object.entries(raw.read)) if (v && PAGE.test(id)) out.read[id] = 1
  if (isObj(raw.p)) {
    for (const [id, v] of Object.entries(raw.p)) {
      const s = stars(v)
      if (s && PAGE.test(id)) out.p[id] = s
    }
  }
  out.fin = stars(raw.fin)
  return out
}

/** Сведение двух копий (a — серверная, b — этого устройства): прочитанное — объединение, звёзды — максимум. */
export function mergePunctuation(a, b) {
  a = normalize(a)
  b = normalize(b)
  const p = { ...a.p }
  for (const [id, s] of Object.entries(b.p)) p[id] = Math.max(p[id] || 0, s)
  return { read: { ...a.read, ...b.read }, p, fin: Math.max(a.fin, b.fin) }
}

const store = createProgressStore({
  module: 'punctuation',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergePunctuation(server, local),
})

/** Копия: движок меняет прочитанное на месте. */
export function readPunctuation() {
  return normalize(JSON.parse(JSON.stringify(store.read())))
}

export function writePunctuation(state) {
  store.write(normalize(state))
}
