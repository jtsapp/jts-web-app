'use client'

// Локальный прогресс по урокам грамматики: раздел клиентский (данные из
// public/practice/grammar/*.json), отдельного бэкенда завершения у него нет,
// поэтому «пройдено» держим в общем хранилище прогресса (память + черновик в
// localStorage + сервер, см. progressStore.js). Ключ — «<level>:<unitId>».

import { GRAMMAR_KEY as KEY, GRAMMAR_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore, doneListOptions } from '../progressStore.js'
import { countUnitTowardsHomework } from '../practiceHomework.js'

const store = createProgressStore({ module: 'grammar', key: KEY, event: EVENT, ...doneListOptions })

function read() {
  return new Set(store.read())
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

// Помечает урок пройденным; хранилище само шлёт событие каталогу и синкает.
export function markUnitDone(level, unitId) {
  const list = store.read()
  const key = unitKey(level, unitId)
  if (!list.includes(key)) store.write([...list, key])
  // Тот же юнит мог быть задан на дом: засчитываем его и там. Отдельным
  // вызовом, а не внутри синка, — домашка живёт в другом сервисе (JTS), и
  // прогресс «Практики» ему в его виде не нужен, нужен только адрес юнита.
  //
  // И при повторном прохождении тоже: раньше отчёт стоял после раннего выхода
  // «уже пройден», и юнит, пройденный до того, как его задали, в домашке не
  // засчитывался никогда — сколько его ни проходи. Бэкенд повтор игнорирует.
  countUnitTowardsHomework('grammar', level, unitId)
}

export const GRAMMAR_PROGRESS_EVENT = EVENT
