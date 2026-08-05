'use client'

// Локальный прогресс статической разговорной практики «Speaking A1–C1»
// (public/practice/situations/<level>.html). Единица прохождения — УРОВЕНЬ,
// а не отдельный сценарий: содержимое уровня рендерится внутри iframe со
// статической страницей, событий по каждому сценарию наружу не приходит.
// Пять уровней = максимум пять единиц, против них и считается квота
// PRACTICE_SITUATIONS (см. /api/practice/entitlement).
//
// Не путать с ситуативками из Java-бэкенда: те адресуются по id, ограничиваются
// через ContentType.SITUATIVKA и живут в соседних карточках той же секции.

import { SITUATIONS_KEY as KEY, SITUATIONS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'

function read() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set() // приватный режим / localStorage отключён
  }
}

function write(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    /* нет квоты — прогресс просто не переживёт перезагрузку */
  }
}

/** Коды уровней, которые студент уже открывал. */
export function readSituationsDone() {
  return [...read()]
}

/** Помечает уровень открытым. Идемпотентно: повторный заход не тратит квоту. */
export function markSituationLevelDone(level) {
  const code = String(level || '').toLowerCase()
  if (!code) return
  const set = read()
  if (set.has(code)) return
  set.add(code)
  write(set)
  pushModule('situations', set) // best-effort серверный синк (no-op для гостя)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

export const SITUATIONS_PROGRESS_EVENT = EVENT
