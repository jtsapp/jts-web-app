'use client'

// Прогресс Literature World — блокнот слов: { notebook: { <слово>: время, когда
// сохранено } } (ключ jtsLit.notebook прототипа). Своё предложение к слову
// («Produce») — текст ученика и живёт только на устройстве (device.js).
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge в момент снимка сервера, как у
// «Чисел»: слово, сохранённое на телефоне, не пропадает от черновика ноутбука,
// где его ещё нет (объединение, время — большее). После снимка запись уходит как
// есть: слово, убранное из блокнота на одном устройстве, остаётся убранным после
// его записи (два открытых одновременно устройства могут затереть друг друга до
// перезагрузки — компромисс остальных разделов-объектов).
//
// Домашней работой раздел не отчитывается: area 'literature' бэкенду неизвестна.

import { LITERATURE_KEY as KEY, LITERATURE_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

// id слов прототипа — строчная латиница, цифры и дефис (green-eyed, wherefore); чужой ключ в хранилище не берём
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/
const MAX_WORDS = 2000
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const stamp = (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0)

const emptyState = () => ({ notebook: {} })

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только то, что похоже на блокнот.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw) || !isObj(raw.notebook)) return out
  for (const [id, ts] of Object.entries(raw.notebook).slice(0, MAX_WORDS)) {
    const t = stamp(ts)
    if (ID.test(id) && t) out.notebook[id] = t
  }
  return out
}

/** Сведение двух копий: слова объединяются, время — большее (сохранено позже). */
export function mergeLiterature(a, b) {
  a = normalize(a)
  b = normalize(b)
  const notebook = { ...a.notebook }
  for (const [id, t] of Object.entries(b.notebook)) notebook[id] = Math.max(notebook[id] || 0, t)
  return normalize({ notebook })
}

const store = createProgressStore({
  module: 'literature',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergeLiterature(server, local),
})

/** Копия: движок меняет блокнот на месте. */
export function readLiterature() {
  return normalize(JSON.parse(JSON.stringify(store.read())))
}

/** Запись движка — как есть (убранное слово остаётся убранным). */
export function writeLiterature(state) {
  store.write(normalize(state))
}
