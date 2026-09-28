'use client'

// Клиент ИИ-разбора «Аркады»: POST /api/practice/arcade/review с Bearer.
// Отказы приходят кодами ('too_short', 'daily_limit_reached', 'not_configured',
// 'review_failed', 'timeout') — пробрасываем их полем code, экран сам
// показывает понятный текст на языке интерфейса.

export { MIN_WORDS } from './reviewContract.js'

// Дольше серверного таймаута модели (45 с), чтобы его ответ успел раньше.
const TIMEOUT_MS = 60000

async function readJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

// Остаток разборов на сегодня. null — гость, нет БД или сбой: счётчик не рисуем.
export async function fetchReviewBudget(token) {
  if (!token) return null
  try {
    const res = await fetch('/api/practice/arcade/review', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    return (await readJson(res)).budget || null
  } catch {
    return null
  }
}

/**
 * @param {{ level: string, topicIndex: number, language: string, transcript: object }} round
 * @returns {Promise<{ review: object, budget: object|null }>}
 */
export async function requestReview(round, token, signal) {
  // Свой контроллер и таймер, а не AbortSignal.any/timeout: их нет в Safari
  // до 17.4, а iPhone у учеников старые.
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  let res
  try {
    res = await fetch('/api/practice/arcade/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(round),
      signal: controller.signal,
    })
  } catch (e) {
    const err = new Error('network')
    err.code = timedOut ? 'timeout' : signal?.aborted ? 'aborted' : 'network'
    err.cause = e
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
  const d = await readJson(res)
  if (!res.ok) {
    const err = new Error(d.error || `review failed ${res.status}`)
    err.code = d.error || 'review_failed'
    err.budget = d.budget || null
    throw err
  }
  return { review: d.review, budget: d.budget || null }
}
