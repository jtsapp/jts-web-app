'use client'

// Прогресс «Чтения» — порт prog()/textScore()/save() из data/jtsreading.html
// (~:552–560, 1003–1007). На текст храним результат каждого упражнения
// (лучший из попыток) и флаг «дочитал до экрана результата».
// Ключ и событие — общие из practiceKeys.js; стейт целиком уезжает на сервер
// через pushModule('reading', …) — семантика replace, см. practiceContract.js.

import { READING_KEY as KEY, READING_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'
import { textScore } from './engine.js'

export function readState() {
  try {
    const raw = localStorage.getItem(KEY)
    const val = raw ? JSON.parse(raw) : null
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return { texts: val.texts && typeof val.texts === 'object' ? val.texts : {} }
    }
  } catch {
    /* приватный режим / битый JSON — начинаем с чистого стейта */
  }
  return { texts: {} }
}

function writeState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* нет квоты — прогресс просто не переживёт перезагрузку */
  }
  pushModule('reading', state) // best-effort серверный синк (no-op для гостя)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

export function textState(textId) {
  return readState().texts[textId] || null
}

/**
 * Результат упражнения. best-of, как в прототипе (:1004): пересдача не может
 * ухудшить сохранённое — иначе ученик боялся бы повторять задания.
 * Показ ответа сюда не приходит вовсе: в прототипе он считался «visual only».
 */
export function markExercise(textId, index, score, total) {
  if (!textId) return
  const state = readState()
  const cur = state.texts[textId] || { ex: {}, done: false }
  const prev = cur.ex[index]
  if (prev && prev.score >= score) return // ничего не улучшилось — не пишем и не будим слушателей
  cur.ex = { ...cur.ex, [index]: { score, total } }
  state.texts[textId] = cur
  writeState(state)
}

/** Отметка «дошёл до экрана результата». Идемпотентна. */
export function markTextDone(textId) {
  if (!textId) return
  const state = readState()
  const cur = state.texts[textId] || { ex: {}, done: false }
  if (cur.done) return
  state.texts[textId] = { ...cur, done: true }
  writeState(state)
}

/** Прогресс одного текста в процентах — тому же тексту нужен его объект данных. */
export function progressOf(text, state = readState()) {
  const saved = state.texts[text.id]
  return textScore(text, saved && saved.ex)
}

/**
 * Прогресс уровня: средний процент по всем его текстам. Требует загруженного
 * уровня — модуль прогресса намеренно не знает, где лежат данные.
 */
export function levelProgress(texts, state = readState()) {
  if (!Array.isArray(texts) || !texts.length) return 0
  let got = 0
  let total = 0
  for (const x of texts) {
    const sc = progressOf(x, state)
    got += sc.got
    total += sc.total
  }
  return total ? Math.round((got / total) * 100) : 0
}

/** Сколько текстов уровня дочитано до результата — подпись на карточке уровня. */
export function levelDoneCount(texts, state = readState()) {
  if (!Array.isArray(texts)) return 0
  return texts.filter((x) => state.texts[x.id] && state.texts[x.id].done).length
}
