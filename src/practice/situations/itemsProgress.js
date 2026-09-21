'use client'

// Прохождение отдельных СЦЕНАРИЕВ разговорной практики: { a1: [1,3,7], … }.
//
// Появилось вместе с нативным экраном: пока уровень жил в iframe, приложение
// не знало, что происходит внутри, и единицей прохождения был целый уровень
// (situationsProgress.js — он остаётся, на нём висит квота из админки).
//
// Зачёт даёт ЗАПИСЬ ответа, а не досмотренное видео: видео может не
// проиграться (кодек, автоплей, сеть), и тогда студент остался бы без отметки,
// хотя задание сделал. Той же логикой живёт SituativkaOverlay.
//
// Чисто локальный ключ: серверный контракт модуля 'situations' — список
// уровней (см. practiceContract.js), карту сценариев он не примет.

import { SITUATIONS_ITEMS_KEY as KEY, SITUATIONS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    const val = raw ? JSON.parse(raw) : null
    if (val && typeof val === 'object' && !Array.isArray(val)) return val
  } catch {
    /* приватный режим / битый JSON — начинаем с чистого стейта */
  }
  return {}
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* нет квоты — прогресс просто не переживёт перезагрузку */
  }
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

/**
 * Номера пройденных сценариев уровня, по возрастанию.
 *
 * Чужие значения отсекаем ДО Number(): `Number(null)` и `Number('')` дают
 * ноль, и битая запись в хранилище превратилась бы в «сценарий №0», который
 * никогда не совпадёт ни с одной карточкой, но испортит счётчик прогресса.
 */
export function readDoneItems(level) {
  const code = String(level || '').toLowerCase()
  const list = read()[code]
  if (!Array.isArray(list)) return []
  const nums = list
    .filter((v) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== ''))
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
  return [...new Set(nums)].sort((a, b) => a - b)
}

/** Отмечает сценарий пройденным. Идемпотентно. */
export function markItemDone(level, id) {
  const code = String(level || '').toLowerCase()
  const num = Number(id)
  if (!code || !Number.isFinite(num)) return
  const state = read()
  const list = Array.isArray(state[code]) ? state[code] : []
  if (list.includes(num)) return
  state[code] = [...list, num].sort((a, b) => a - b)
  write(state)
}

/** Сколько сценариев уровня пройдено — для прогресс-бара каталога. */
export function countDone(level) {
  return readDoneItems(level).length
}
