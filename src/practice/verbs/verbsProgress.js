'use client'

// Прогресс «Неправильных глаголов»: отмеченные «потренировать позже» и
// результат каждого задания. Ключ результата — прототипный
// (practice-v4-<режим>-<формы>-<уровень>): «повтори три формы на A1» и
// «повтори две формы на A1» — разные упражнения, и засчитывать одно за другое
// нельзя.
//
// Хранение — общее хранилище прогресса (память + черновик + сервер, replace,
// см. progressStore.js). Настройки (темп, громкости, уровень) сюда
// не входят: это свойство устройства, они в verbsSettings.js.
//
// Домашней работой раздел не отчитывается: area 'verbs' бэкенду неизвестна.

import { VERBS_KEY as KEY, VERBS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'
import { nextEntry } from './engine.js'

function isObj(x) {
  return !!x && typeof x === 'object' && !Array.isArray(x)
}

// Своё «зеркало в памяти» у раздела было и раньше; теперь память общая
// (progressStore.js) и вдобавок берёт ответ сервера, когда localStorage забит.
const store = createProgressStore({
  module: 'verbs',
  key: KEY,
  event: EVENT,
  empty: () => ({ saved: {}, progress: {} }),
  normalize: (val) =>
    isObj(val)
      ? { saved: isObj(val.saved) ? val.saved : {}, progress: isObj(val.progress) ? val.progress : {} }
      : { saved: {}, progress: {} },
})

// Состояние общее с памятью хранилища — только читать; писатели собирают новое.
export function readState() {
  return store.read()
}

function writeState(state) {
  store.write(state) // черновик, событие и синк — внутри хранилища
}

export function savedVerbs(state = readState()) {
  return state.saved
}

export function savedCount(state = readState()) {
  return Object.keys(state.saved).filter((k) => state.saved[k]).length
}

/** Звёздочка в таблице. Снятая отметка удаляется, а не хранится false. */
export function toggleSaved(v1) {
  if (!v1) return
  const state = readState()
  const saved = { ...state.saved }
  if (saved[v1]) delete saved[v1]
  else saved[v1] = true
  writeState({ ...state, saved })
}

export function scoresFor(key, state = readState()) {
  return isObj(state.progress[key]) ? state.progress[key] : {}
}

export function recordResult(key, id, result) {
  if (!key || !id) return
  const state = readState()
  const bucket = { ...scoresFor(key, state) }
  bucket[id] = nextEntry(bucket[id], result)
  writeState({ ...state, progress: { ...state.progress, [key]: bucket } })
}

/** «Сбросить прогресс»: результаты стираются, отмеченные глаголы остаются. */
export function resetResults() {
  const state = readState()
  writeState({ ...state, progress: {} })
}
