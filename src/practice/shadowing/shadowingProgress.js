'use client'

// Пройденные фразы Shadowing. Прогресс — множество id вида `${lessonId}_${index}`
// (sg_000, v2_014, …; см. segmentId в engine.js). «Пройдено» = фразу записали
// голосом хотя бы раз (в трениже нет верного/неверного — засчитываем факт
// записи). Ключ и событие общие из practiceKeys.js, серверный синк — через
// practiceSync. По образцу listeningProgress.js.

import { SHADOWING_KEY as KEY, SHADOWING_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
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

export function isSegmentDone(segId) {
  return read().has(segId)
}

// Множество пройденных id одного урока (префикс id — id урока: sg_000 → 'sg').
export function getLessonDone(lessonId) {
  const prefix = `${lessonId}_`
  const out = new Set()
  for (const id of read()) if (id.startsWith(prefix)) out.add(id)
  return out
}

// Сколько фраз урока пройдено — для подписи «12 / 46» на карточке.
export function countLessonDone(lessonId) {
  return getLessonDone(lessonId).size
}

export function markSegmentDone(segId) {
  if (typeof segId !== 'string' || !segId) return
  const set = read()
  if (set.has(segId)) return
  set.add(segId)
  write(set)
  pushModule('shadowing', set) // best-effort серверный синк (no-op для гостя)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

export const SHADOWING_PROGRESS_EVENT = EVENT
