'use client'

// Прогресс воркбуков A0–B2 (public/practice/workbooks/<level>.html).
// Единица прохождения — УРОВЕНЬ (как у Speaking Practice): iframe не шлёт
// событий по юнитам, поэтому квота PRACTICE_WORKBOOKS считает разные уровни.
// Хранение — общее хранилище прогресса (память + черновик + сервер, см.
// progressStore.js).

import { WORKBOOKS_KEY as KEY, WORKBOOKS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore, doneListOptions } from '../progressStore.js'

const store = createProgressStore({ module: 'workbooks', key: KEY, event: EVENT, ...doneListOptions })

/** Коды уровней, которые студент уже открывал. */
export function readWorkbooksDone() {
  return [...store.read()]
}

/** Помечает уровень открытым. Идемпотентно: повторный заход не тратит квоту. */
export function markWorkbookLevelDone(level) {
  const code = String(level || '').toLowerCase()
  if (!code) return
  const list = store.read()
  if (list.includes(code)) return
  store.write([...list, code]) // событие и синк — внутри хранилища
}

export const WORKBOOKS_PROGRESS_EVENT = EVENT
