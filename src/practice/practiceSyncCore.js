// Чистые хелперы клиентского синка: что отправлять на сервер и как разложить
// серверный стейт по локальным хранилищам. Ни fetch, ни прямых глобалей —
// localStorage.setItem и window.dispatchEvent инъектируются, поэтому node-тест.

import { normalizeDone } from '../lib/practiceContract.js'
import {
  VOCAB_KEY,
  GRAMMAR_KEY,
  LISTENING_KEY,
  GRAMMAR_PROGRESS_EVENT,
  LISTENING_PROGRESS_EVENT,
} from './practiceKeys.js'

// raw: для vocab — объект стейта; для grammar/listening — Set или массив id.
export function serializeForPush(module, raw) {
  if (module === 'vocab') return raw && typeof raw === 'object' ? raw : {}
  const arr = raw instanceof Set ? [...raw] : raw
  return { done: normalizeDone(arr) }
}

// serverState — ответ GET /api/practice/state (поле state). Пишем в те же ключи,
// что читают экраны, и будим каталоги теми же событиями, что и локальная отметка.
export function applyHydratedState(serverState, { setItem, dispatch }) {
  if (!serverState || typeof serverState !== 'object') return
  if (serverState.vocab && typeof serverState.vocab === 'object') {
    setItem(VOCAB_KEY, JSON.stringify(serverState.vocab))
  }
  if (serverState.grammar) {
    setItem(GRAMMAR_KEY, JSON.stringify(normalizeDone(serverState.grammar.done)))
    dispatch(GRAMMAR_PROGRESS_EVENT)
  }
  if (serverState.listening) {
    setItem(LISTENING_KEY, JSON.stringify(normalizeDone(serverState.listening.done)))
    dispatch(LISTENING_PROGRESS_EVENT)
  }
}
