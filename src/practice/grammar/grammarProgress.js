'use client'

// Локальный прогресс по урокам грамматики: раздел клиентский (данные из
// public/practice/grammar/*.json), отдельного бэкенда завершения у него нет,
// поэтому «пройдено» держим в localStorage. Ключ — «<level>:<unitId>».

import { GRAMMAR_KEY as KEY, GRAMMAR_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'
import { countUnitTowardsHomework } from '../practiceHomework.js'

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

export function unitKey(level, unitId) {
  return `${String(level).toLowerCase()}:${unitId}`
}

export function isUnitDone(level, unitId) {
  return read().has(unitKey(level, unitId))
}

// Множество id пройденных юнитов для уровня (для каталога).
export function getDoneUnits(level) {
  const prefix = `${String(level).toLowerCase()}:`
  const out = new Set()
  for (const k of read()) if (k.startsWith(prefix)) out.add(Number(k.slice(prefix.length)))
  return out
}

// Помечает урок пройденным и уведомляет каталог в этой же вкладке.
export function markUnitDone(level, unitId) {
  const set = read()
  const key = unitKey(level, unitId)
  if (set.has(key)) return
  set.add(key)
  write(set)
  pushModule('grammar', set) // best-effort серверный синк (no-op для гостя)
  // Тот же юнит мог быть задан на дом: засчитываем его и там. Отдельным
  // вызовом, а не внутри синка, — домашка живёт в другом сервисе (JTS), и
  // прогресс «Практики» ему в его виде не нужен, нужен только адрес юнита.
  countUnitTowardsHomework('grammar', level, unitId)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

export const GRAMMAR_PROGRESS_EVENT = EVENT
