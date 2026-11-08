// Окно Луны → журнал её ответов и их оценки (/api/assistant/rating; ТЗ v2.0, 8.5; спека
// docs/superpowers/specs/2026-11-08-luna-answer-rating-design.md).
//
// Запись одна на ответ модели, окно шлёт её целиком несколько раз: когда ответ дописан, когда пришёл первый звук
// (голосовой ответ часто начинает звучать позже, чем дописан текст), когда ученик поставил 👍/👎 или нажал кнопку под
// ответом. seq растёт с каждым разом, и роут не даст запоздавшему запросу переписать новое состояние.
//
// Сбой записи ученик не видит и ответ из-за неё не ждёт: оценка не важнее разговора.

import { actionKey } from './ratingShape.js'

const MAX_ENTRIES = 200

/**
 * Писать ли журнал. В vitest и под webdriver (e2e) — нет, пока тест не поставит globalThis.__jtsRating = true: иначе
 * тесты окна, считающие вызовы fetch, и e2e других разделов ловили бы лишние запросы (тот же приём, что у
 * «Луна пишет первой», __jtsProactive).
 */
export function ratingEnabled() {
  if (globalThis.__jtsRating) return true
  if (process.env.NODE_ENV === 'test') return false
  return !(typeof navigator !== 'undefined' && navigator.webdriver)
}

/** id ответа или разговора: латиница и цифры, 21 знак (ratingShape: 8–48). */
export function newRatingId(prefix = 'r') {
  const bytes = new Uint8Array(12)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return prefix + Array.from(bytes, (b) => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-8)
}

/** Ключи кнопок ответа для журнала (ratingShape.actionKey). */
export const actionKeys = (actions) => (actions || []).filter(Boolean).map(actionKey).filter(Boolean)

function post(token, entry) {
  if (!token || !ratingEnabled()) return Promise.resolve(false)
  const { sent, ...payload } = entry
  void sent
  const body = JSON.stringify(payload)
  return fetch('/api/assistant/rating', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body,
    // Оценку ставят и прямо перед закрытием вкладки: keepalive доносит запрос (у него потолок 64 КБ на всё).
    keepalive: body.length < 60_000,
  })
    .then((r) => r.ok)
    .catch(() => false)
}

/**
 * Журнал ответов вкладки: id ответа → запись. open — ответ дописан (и сразу уходит), patch — дописать поля,
 * send — отправить текущее состояние.
 */
export function createRatingBook() {
  const book = new Map()
  const send = (rid, token) => {
    const e = book.get(rid)
    if (!e) return Promise.resolve(false)
    e.seq += 1
    e.sent = true
    return post(token, e)
  }
  return {
    open(rid, fields, token) {
      book.set(rid, { id: rid, seq: 0, rating: null, reasons: [], comment: '', clicked: null, actions: [], ...fields })
      // Старые ответы оценивают редко, а вкладка живёт часами: держим последние MAX_ENTRIES.
      if (book.size > MAX_ENTRIES) book.delete(book.keys().next().value)
      return send(rid, token)
    },
    get: (rid) => book.get(rid) || null,
    patch(rid, fields) {
      const e = book.get(rid)
      if (e) Object.assign(e, fields)
      return e || null
    },
    send,
  }
}
