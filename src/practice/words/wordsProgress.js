'use client'

// Прогресс «Слов в картинках». Своего прогресса у прототипа нет вовсе — он
// целиком наш, по образцу «Чтения»: на сцену храним найденные слова и флаг
// «прошёл до экрана результата».
//
// Найденные копятся, а не перезаписываются раундом: сцену проходят в несколько
// заходов, и выйти на середине — нормальный сценарий, а не сброс.
//
// Ключ и событие — общие из practiceKeys.js; стейт целиком уезжает на сервер
// через pushModule('words', …) — семантика replace, см. practiceContract.js.
//
// Домашней работой раздел не отчитывается: у сцен нет CEFR-уровня, задать
// «пройди Ферму» преподаватель не может, и area 'words' бэкенду неизвестна.

import { WORDS_KEY as KEY, WORDS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'

export function readState() {
  try {
    const raw = localStorage.getItem(KEY)
    const val = raw ? JSON.parse(raw) : null
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return { scenes: val.scenes && typeof val.scenes === 'object' ? val.scenes : {} }
    }
  } catch {
    /* приватный режим / битый JSON — начинаем с чистого стейта */
  }
  return { scenes: {} }
}

function writeState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* нет квоты — прогресс просто не переживёт перезагрузку */
  }
  pushModule('words', state) // best-effort серверный синк (no-op для гостя)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

function sceneEntry(state, sceneId) {
  const cur = state.scenes[sceneId]
  return {
    found: Array.isArray(cur && cur.found) ? cur.found : [],
    done: !!(cur && cur.done),
  }
}

/** Состояние одной сцены: что найдено и пройдена ли она целиком. */
export function sceneState(sceneId, state = readState()) {
  return sceneEntry(state, sceneId)
}

/** Отметка «слово найдено». Идемпотентна: повтор не будит слушателей. */
export function markWordFound(sceneId, wordId) {
  if (!sceneId || !wordId) return
  const state = readState()
  const cur = sceneEntry(state, sceneId)
  if (cur.found.includes(wordId)) return
  state.scenes[sceneId] = { ...cur, found: [...cur.found, wordId] }
  writeState(state)
}

/** Отметка «дошёл до экрана результата». Идемпотентна. */
export function markSceneDone(sceneId) {
  if (!sceneId) return
  const state = readState()
  const cur = sceneEntry(state, sceneId)
  if (cur.done) return
  state.scenes[sceneId] = { ...cur, done: true }
  writeState(state)
}

/**
 * Прогресс сцены в процентах — сколько её слов найдено хоть раз.
 * Считается от размера пула, который знает вызывающий: модуль прогресса
 * намеренно не знает, где лежат данные.
 */
export function sceneProgress(sceneId, total, state = readState()) {
  if (!total) return 0
  const { found } = sceneEntry(state, sceneId)
  return Math.min(100, Math.round((found.length / total) * 100))
}

/** Сколько сцен секции пройдено до конца — подпись на карточке секции. */
export function sectionDoneCount(scenes, state = readState()) {
  if (!Array.isArray(scenes)) return 0
  return scenes.filter((s) => state.scenes[s.id] && state.scenes[s.id].done).length
}

/** Средний прогресс по сценам секции — кольцо на карточке. */
export function sectionProgress(scenes, state = readState()) {
  if (!Array.isArray(scenes) || !scenes.length) return 0
  let got = 0
  let total = 0
  for (const s of scenes) {
    got += sceneEntry(state, s.id).found.length
    total += s.count || 0
  }
  return total ? Math.round((got / total) * 100) : 0
}
