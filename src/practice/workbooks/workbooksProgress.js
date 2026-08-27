'use client'

// Локальный прогресс воркбуков A0–B2 (public/practice/workbooks/<level>.html).
// Единица прохождения — УРОВЕНЬ (как у Speaking Practice): iframe не шлёт
// событий по юнитам, поэтому квота PRACTICE_WORKBOOKS считает разные уровни.

import { WORKBOOKS_KEY as KEY, WORKBOOKS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'

function read() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function write(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    /* нет квоты — прогресс не переживёт перезагрузку */
  }
}

/** Коды уровней, которые студент уже открывал. */
export function readWorkbooksDone() {
  return [...read()]
}

/** Помечает уровень открытым. Идемпотентно: повторный заход не тратит квоту. */
export function markWorkbookLevelDone(level) {
  const code = String(level || '').toLowerCase()
  if (!code) return
  const set = read()
  if (set.has(code)) return
  set.add(code)
  write(set)
  pushModule('workbooks', set)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

export const WORKBOOKS_PROGRESS_EVENT = EVENT
