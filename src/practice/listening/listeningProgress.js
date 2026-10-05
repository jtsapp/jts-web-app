'use client'

// Пройденные задания аудирования. У раздела не было ни хранения, ни понятия
// «пройдено» — вводим множество id верно выполненных заданий (id стабильны:
// a1_001, a2_005, … в public/practice/listening/content/<level>.json). Ключ и
// событие — общие из practiceKeys.js; хранение — общее хранилище прогресса
// (память + черновик + сервер, см. progressStore.js).

import { LISTENING_KEY as KEY, LISTENING_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore, doneListOptions } from '../progressStore.js'

const store = createProgressStore({ module: 'listening', key: KEY, event: EVENT, ...doneListOptions })

function read() {
  return new Set(store.read())
}

export function isTaskDone(taskId) {
  return read().has(taskId)
}

// Множество пройденных id для уровня (префикс id — код уровня: a1_001 → 'a1').
export function getListeningDone(level) {
  const prefix = `${String(level).toLowerCase()}_`
  const out = new Set()
  for (const id of read()) if (id.startsWith(prefix)) out.add(id)
  return out
}

export function markTaskDone(taskId) {
  if (typeof taskId !== 'string' || !taskId) return
  const list = store.read()
  if (list.includes(taskId)) return
  store.write([...list, taskId]) // событие и синк — внутри хранилища
}

export const LISTENING_PROGRESS_EVENT = EVENT
