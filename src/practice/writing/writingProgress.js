'use client'

// Прогресс «Письма». Перенос движка Progress из data/jtswriting.html
// (taskKey/markTask/stepDone/markSeen, строки ~9998–10017 и 10362–10372):
// tasks — лучший результат по каждому заданию, seen — просмотры теоретических
// шагов 1–3 (у них нет проверяемого ответа, «пройдено» = «открывал»).
// Ключ и событие — общие из practiceKeys.js; стейт целиком уезжает на сервер
// через pushModule('writing', …) — семантика replace, см. practiceContract.js.

import { WRITING_KEY as KEY, WRITING_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'
// Единица знаменателя прогресса — из движка (11 заданий на жанр в прототипе):
// движок чистый и без данных, тянуть его сюда безопасно.
import { TASKS_PER_GENRE } from './engine.js'

// Прототипный pct: доля в целых процентах, деление на ноль — 0.
function pct(a, b) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function taskKey(genreId, taskId) {
  return genreId + ':' + taskId
}

export function readState() {
  try {
    const raw = localStorage.getItem(KEY)
    const val = raw ? JSON.parse(raw) : null
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return {
        tasks: val.tasks && typeof val.tasks === 'object' ? val.tasks : {},
        seen: val.seen && typeof val.seen === 'object' ? val.seen : {},
      }
    }
  } catch {
    /* приватный режим / битый JSON — начинаем с чистого стейта */
  }
  return { tasks: {}, seen: {} }
}

function writeState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* нет квоты — прогресс просто не переживёт перезагрузку */
  }
}

function emitChanged() {
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

export function taskState(genreId, taskId) {
  return readState().tasks[taskKey(genreId, taskId)] || null
}

export function markTask(genreId, taskId, correct, total) {
  if (!genreId || !taskId) return
  const state = readState()
  const k = taskKey(genreId, taskId)
  const prev = state.tasks[k]
  // best-of как в прототипе (jtswriting.html:10003): пересдача не может
  // ухудшить сохранённый результат — иначе ученик боялся бы повторять задания.
  const best = prev ? Math.max(prev.correct || 0, correct) : correct
  state.tasks[k] = { done: true, correct: best, total, at: Date.now() }
  writeState(state)
  pushModule('writing', state) // best-effort серверный синк (no-op для гостя)
  emitChanged()
}

// Идемпотентна: фиксируем время ПЕРВОГО просмотра, повторные заходы не пишут,
// не синкают и не будят слушателей (перерисовка каталога впустую).
export function markSeen(genreId, stepN) {
  if (!genreId) return
  const state = readState()
  const k = genreId + ':s' + stepN
  if (state.seen[k]) return
  state.seen[k] = Date.now()
  writeState(state)
  pushModule('writing', state)
  emitChanged()
}

// genre — объект жанра из движка (id + tasks). Шаги 1–3 — теория («пройдено» =
// открывал), шаги 4+ — все задания шага выполнены; шаг без заданий не бывает
// пройденным (как в прототипе, jtswriting.html:10362).
export function stepDone(genre, n) {
  if (!genre) return false
  const state = readState()
  if (n <= 3) return !!state.seen[genre.id + ':s' + n]
  const list = (genre.tasks || []).filter((t) => t.step === n)
  if (!list.length) return false
  return list.every((t) => !!state.tasks[taskKey(genre.id, t.id)])
}

export function genreDoneCount(genreId) {
  const prefix = genreId + ':'
  let n = 0
  const tasks = readState().tasks
  for (const k in tasks) {
    if (Object.prototype.hasOwnProperty.call(tasks, k) && k.indexOf(prefix) === 0) n++
  }
  return n
}

export function genreProgress(genreId) {
  return pct(genreDoneCount(genreId), TASKS_PER_GENRE)
}

// Прототипный levelProgress считал по посевам уровня; здесь список id жанров
// передаёт вызывающий экран — модуль прогресса не знает состав уровней.
export function levelProgress(genreIds) {
  const ids = Array.isArray(genreIds) ? genreIds : []
  let sum = 0
  for (const id of ids) sum += genreDoneCount(id)
  return pct(sum, ids.length * TASKS_PER_GENRE)
}
