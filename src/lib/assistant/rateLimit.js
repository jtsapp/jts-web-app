// Лимит вопросов помощнику на ученика. Каждый вопрос — платный вызов модели,
// и без лимита один зацикленный скрипт (или ученик, решивший «поболтать» вместо
// Speaking Buddy) сжигает бюджет всех.
//
// Счётчик в памяти процесса: на одном контейнере это точный лимит, при
// нескольких — лимит на каждый. Для защиты от перерасхода этого хватает;
// учёт для отчётов, если понадобится, — в llm_cost-логах (task: site_assistant).

export const WINDOW_LIMIT = 20
export const WINDOW_MS = 10 * 60 * 1000
export const DAY_LIMIT = 150
export const DAY_MS = 24 * 60 * 60 * 1000

/**
 * @returns {(key: string, now?: number) => { ok: boolean, retryAfterSec?: number }}
 */
export function createRateLimiter({
  windowLimit = WINDOW_LIMIT,
  windowMs = WINDOW_MS,
  dayLimit = DAY_LIMIT,
  dayMs = DAY_MS,
} = {}) {
  const hits = new Map() // key → отметки времени за последние сутки, по возрастанию

  return function take(key, now = Date.now()) {
    const recent = (hits.get(key) || []).filter((t) => now - t < dayMs)
    const inWindow = recent.filter((t) => now - t < windowMs)

    if (recent.length >= dayLimit) {
      hits.set(key, recent)
      return { ok: false, retryAfterSec: Math.ceil((recent[0] + dayMs - now) / 1000) }
    }
    if (inWindow.length >= windowLimit) {
      hits.set(key, recent)
      return { ok: false, retryAfterSec: Math.ceil((inWindow[0] + windowMs - now) / 1000) }
    }
    recent.push(now)
    hits.set(key, recent)
    // Уборка: иначе Map растёт с каждым учеником, заходившим хоть раз.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] >= dayMs) hits.delete(k)
    }
    return { ok: true }
  }
}
