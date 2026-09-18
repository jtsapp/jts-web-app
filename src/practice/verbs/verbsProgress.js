'use client'

// Прогресс «Неправильных глаголов»: отмеченные «потренировать позже» и
// результат каждого задания. Ключ результата — прототипный
// (practice-v4-<режим>-<формы>-<уровень>): «повтори три формы на A1» и
// «повтори две формы на A1» — разные упражнения, и засчитывать одно за другое
// нельзя.
//
// Стейт целиком уезжает на сервер через pushModule('verbs', …) — семантика
// replace, см. practiceContract.js. Настройки (темп, громкости, уровень) сюда
// не входят: это свойство устройства, они в verbsSettings.js.
//
// Домашней работой раздел не отчитывается: area 'verbs' бэкенду неизвестна.

import { VERBS_KEY as KEY, VERBS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'
import { nextEntry } from './engine.js'

function isObj(x) {
  return !!x && typeof x === 'object' && !Array.isArray(x)
}

// Зеркало в памяти на случай, когда хранилище не пишет (квота, приватный
// режим): без него результат попытки терялся бы сразу, а не «до перезагрузки».
let memo = null
let storageBroken = false

export function readState() {
  if (storageBroken && memo) return memo
  try {
    const raw = localStorage.getItem(KEY)
    const val = raw ? JSON.parse(raw) : null
    if (isObj(val)) {
      return { saved: isObj(val.saved) ? val.saved : {}, progress: isObj(val.progress) ? val.progress : {} }
    }
  } catch {
    /* приватный режим / битый JSON — начинаем с зеркала или с чистого стейта */
    if (memo) return memo
  }
  return { saved: {}, progress: {} }
}

function writeState(state) {
  memo = state
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    storageBroken = false
  } catch {
    /* нет квоты — прогресс живёт в зеркале до перезагрузки */
    storageBroken = true
  }
  pushModule('verbs', state) // best-effort серверный синк (no-op для гостя)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
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
