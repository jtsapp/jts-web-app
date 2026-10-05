'use client'

// Прогресс статической разговорной практики «Speaking A1–C1»
// (public/practice/situations/<level>.html). Единица прохождения — УРОВЕНЬ,
// а не отдельный сценарий: содержимое уровня рендерится внутри iframe со
// статической страницей, событий по каждому сценарию наружу не приходит.
// Пять уровней = максимум пять единиц, против них и считается квота
// PRACTICE_SITUATIONS (см. /api/practice/entitlement).
//
// Не путать с ситуативками из Java-бэкенда: те адресуются по id, ограничиваются
// через ContentType.SITUATIVKA и живут в соседних карточках той же секции.
//
// Хранение — общее хранилище прогресса (память + черновик + сервер, см.
// progressStore.js).

import { SITUATIONS_KEY as KEY, SITUATIONS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore, doneListOptions } from '../progressStore.js'

const store = createProgressStore({ module: 'situations', key: KEY, event: EVENT, ...doneListOptions })

/** Коды уровней, которые студент уже открывал. */
export function readSituationsDone() {
  return [...store.read()]
}

/** Помечает уровень открытым. Идемпотентно: повторный заход не тратит квоту. */
export function markSituationLevelDone(level) {
  const code = String(level || '').toLowerCase()
  if (!code) return
  const list = store.read()
  if (list.includes(code)) return
  store.write([...list, code]) // событие и синк — внутри хранилища
}

export const SITUATIONS_PROGRESS_EVENT = EVENT
