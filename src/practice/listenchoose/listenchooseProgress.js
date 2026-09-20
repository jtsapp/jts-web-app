'use client'

// Прогресс «Слушай и выбирай»: какие задания выборка уже показывала на каждой
// сложности. Нужен, чтобы новый набор после перезахода не начинался с тех же
// заданий (`history` прототипа — там он жил в sessionStorage вкладки и
// пропадал с ней).
//
// Стейт целиком уезжает на сервер через pushModule('listenchoose', …) —
// семантика replace, см. practiceContract.js. Недоигранный набор и настройки
// сюда не входят: это свойство устройства, они в listenchooseSettings.js.
//
// Домашней работой раздел не отчитывается: area 'listenchoose' бэкенду
// неизвестна, у сцен нет CEFR-уровня.

import { LISTENCHOOSE_KEY as KEY, LISTENCHOOSE_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { pushModule } from '../practiceSync.js'
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

// Зеркало в памяти на случай, когда хранилище не пишет (квота, приватный
// режим): без него «уже было» терялось бы сразу, а не «до перезагрузки». Читаем
// его ТОЛЬКО пока хранилище сломано: иначе после выхода из аккаунта
// (clearLocalPractice стирает ключ) следующий ученик получил бы чужое.
let memo = null
let storageBroken = false

export function readState() {
  if (storageBroken && memo) return memo
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    /* приватный режим / битый JSON — начинаем с зеркала или с чистого стейта */
    if (memo) return memo
  }
  return emptyState()
}

function writeState(state, { sync = true } = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    storageBroken = false
    memo = null
  } catch {
    /* нет квоты — прогресс живёт в зеркале до перезагрузки */
    storageBroken = true
    memo = state
  }
  if (sync) pushModule('listenchoose', state) // best-effort серверный синк (no-op для гостя)
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
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
