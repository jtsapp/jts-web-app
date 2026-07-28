'use client'

// Пройденные задания аудирования. У раздела не было ни хранения, ни понятия
// «пройдено» — вводим множество id верно выполненных заданий (id стабильны:
// a1_001, a2_005, … в public/practice/listening/content/<level>.json). Ключ и
// событие — общие из practiceKeys.js.

import { LISTENING_KEY as KEY, LISTENING_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
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
    /* нет квоты — прогресс просто не переживёт перезагрузку */
  }
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
  const set = read()
  if (set.has(taskId)) return
  set.add(taskId)
  write(set)
  pushModule('listening', set) // best-effort серверный синк (no-op для гостя)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

export const LISTENING_PROGRESS_EVENT = EVENT
