'use client'

// Прогресс «Слушай и выбирай»: какие задания выборка уже показывала на каждой
// сложности. Нужен, чтобы новый набор после перезахода не начинался с тех же
// заданий (`history` прототипа — там он жил в sessionStorage вкладки и
// пропадал с ней).
//
// Хранение — общее хранилище прогресса (память + черновик + сервер, replace,
// см. progressStore.js). Недоигранный набор и настройки
// сюда не входят: это свойство устройства, они в listenchooseSettings.js.
//
// Домашней работой раздел не отчитывается: area 'listenchoose' бэкенду
// неизвестна, у сцен нет CEFR-уровня.

import { LISTENCHOOSE_KEY as KEY, LISTENCHOOSE_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'
import { LEVELS } from './engine.js'

const emptyState = () => ({ seen: { easy: [], medium: [], hard: [] } })

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только
// то, что похоже на список id по известным сложностям.
function normalize(raw) {
  const out = emptyState()
  const seen = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw.seen : null
  if (seen && typeof seen === 'object') {
    for (const level of LEVELS) {
      const ids = seen[level]
      if (Array.isArray(ids)) out.seen[level] = [...new Set(ids.filter((id) => typeof id === 'string' && id))]
    }
  }
  return out
}

// Своё «зеркало в памяти» у раздела было и раньше; теперь память общая
// (progressStore.js): она держит прогресс, пока хранилище не пишет, забывает
// его при выходе из аккаунта и берёт ответ сервера, когда localStorage забит.
const store = createProgressStore({
  module: 'listenchoose',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
})

export function readState() {
  return store.read()
}

function writeState(state, { sync = true } = {}) {
  store.write(state, { sync }) // черновик, событие и синк — внутри хранилища
}

export function readSeen(level) {
  return LEVELS.includes(level) ? readState().seen[level] : []
}

/**
 * Заменяет «уже было» одной сложности; остальные не трогает. `sync: false` —
 * записать только локально: набор, нарисованный при монтировании экрана, не
 * должен уходить на сервер, пока hydratePractice (его не ждут) не привёз
 * серверное «уже было»: replace затёр бы его почти пустым локальным.
 */
export function writeSeen(level, ids, { sync = true } = {}) {
  if (!LEVELS.includes(level)) return
  const state = readState()
  const next = normalize({ seen: { ...state.seen, [level]: ids } })
  writeState(next, { sync })
}
