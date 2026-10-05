'use client'

// Прогресс «Слов в картинках». Своего прогресса у прототипа нет вовсе — он
// целиком наш, по образцу «Чтения»: на сцену храним найденные слова и флаг
// «прошёл до экрана результата».
//
// Найденные копятся, а не перезаписываются раундом: сцену проходят в несколько
// заходов, и выйти на середине — нормальный сценарий, а не сброс.
//
// Ключ и событие — общие из practiceKeys.js; хранение — общее хранилище
// прогресса (память + черновик + сервер, replace, см. progressStore.js).
//
// Домашней работой раздел не отчитывается: у сцен нет CEFR-уровня, задать
// «пройди Ферму» преподаватель не может, и area 'words' бэкенду неизвестна.

import { WORDS_KEY as KEY, WORDS_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

const store = createProgressStore({
  module: 'words',
  key: KEY,
  event: EVENT,
  empty: () => ({ scenes: {} }),
  normalize: (val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? { scenes: val.scenes && typeof val.scenes === 'object' ? val.scenes : {} }
      : { scenes: {} },
})

// Состояние общее с памятью хранилища — только читать; писатели собирают новое.
export function readState() {
  return store.read()
}

function writeScene(state, sceneId, entry) {
  store.write({ ...state, scenes: { ...state.scenes, [sceneId]: entry } }) // событие и синк — внутри
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
  writeScene(state, sceneId, { ...cur, found: [...cur.found, wordId] })
}

/** Отметка «дошёл до экрана результата». Идемпотентна. */
export function markSceneDone(sceneId) {
  if (!sceneId) return
  const state = readState()
  const cur = sceneEntry(state, sceneId)
  if (cur.done) return
  writeScene(state, sceneId, { ...cur, done: true })
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
