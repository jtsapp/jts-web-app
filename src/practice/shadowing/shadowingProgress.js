'use client'

// Пройденные фразы Shadowing. Прогресс — множество id вида `${lessonId}_${index}`
// (sg_000, v2_014, …; см. segmentId в engine.js). «Пройдено» = фразу записали
// голосом хотя бы раз (в трениже нет верного/неверного — засчитываем факт
// записи). Ключ и событие общие из practiceKeys.js, хранение — общее хранилище
// прогресса (память + черновик + сервер, см. progressStore.js).

import { SHADOWING_KEY as KEY, SHADOWING_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore, doneListOptions } from '../progressStore.js'

const store = createProgressStore({ module: 'shadowing', key: KEY, event: EVENT, ...doneListOptions })

function read() {
  return new Set(store.read())
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

/**
 * Урок пройден — все его фразы записаны хотя бы раз.
 *
 * Порога «сколько достаточно» у шэдоуинга нет: верного и неверного в тренаже
 * тоже нет, засчитывается сам факт записи. Поэтому единственная честная
 * граница — все фразы урока.
 */
export function isLessonDone(lessonId, total) {
  return total > 0 && countLessonDone(lessonId) >= total
}

export function markSegmentDone(segId) {
  if (typeof segId !== 'string' || !segId) return
  const list = store.read()
  if (list.includes(segId)) return
  store.write([...list, segId]) // событие и синк — внутри хранилища
}

export const SHADOWING_PROGRESS_EVENT = EVENT
