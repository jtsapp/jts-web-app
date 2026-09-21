'use client'

// Записи ответов в «Ситуациях»: blob последней попытки на сценарий.
//
// В IndexedDB, а не в localStorage: там строки и квота в несколько мегабайт, а
// минута записи — это мегабайты. Прототип хранил так же (`jts_a1_audio`), и
// смысл тот же: студент возвращается к сценарию и слышит, как звучал вчера.
//
// Ключ — `<level>-<id>`, а не сквозной номер: номера сценариев начинаются с
// единицы на каждом уровне, и без префикса A1 №1 затирал бы C1 №1.

import { createIdbStore } from '../../lib/idbStore.js'

const store = createIdbStore('jts-situations', 'takes')

function key(level, id) {
  return `${String(level || '').toLowerCase()}-${Number(id)}`
}

export async function saveTake(level, id, blob) {
  if (!blob) return
  await store.put(key(level, id), { blob, ts: Date.now() })
}

export async function getTake(level, id) {
  const rec = await store.get(key(level, id))
  return rec?.blob || null
}

export async function deleteTake(level, id) {
  await store.del(key(level, id))
}
