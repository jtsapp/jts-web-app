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
 * @returns {((key: string, now?: number) => { ok: boolean, retryAfterSec?: number })
 *           & { refund: (key: string) => void }}
 */
export function createRateLimiter({
  windowLimit = WINDOW_LIMIT,
  windowMs = WINDOW_MS,
  dayLimit = DAY_LIMIT,
  dayMs = DAY_MS,
} = {}) {
  const hits = new Map() // key → отметки времени за последние сутки, по возрастанию

  function take(key, now = Date.now()) {
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

  // Вернуть последний засчитанный вопрос: он не состоялся (модель упала) или
  // не должен считаться (вопрос не по теме — у него свой счётчик).
  take.refund = (key) => {
    const list = hits.get(key)
    if (list?.length) list.pop()
  }

  return take
}

// Вопросы не по теме. Основной лимит они не тратят, но и бесконечно их
// задавать нельзя: каждый — всё-таки вызов модели. После dayLimit таких
// вопросов за сутки помощник молчит cooldownMs для этого ученика целиком.
export const OFFTOPIC_DAY_LIMIT = 5
export const OFFTOPIC_COOLDOWN_MS = 30 * 60 * 1000

export function createOfftopicGuard({
  dayLimit = OFFTOPIC_DAY_LIMIT,
  dayMs = DAY_MS,
  cooldownMs = OFFTOPIC_COOLDOWN_MS,
} = {}) {
  const hits = new Map() // key → отметки вопросов не по теме за сутки
  const until = new Map() // key → до какого момента помощник молчит

  return {
    /** Сколько секунд ещё молчать; 0 — можно спрашивать. */
    blockedFor(key, now = Date.now()) {
      const end = until.get(key)
      if (!end || end <= now) {
        until.delete(key)
        return 0
      }
      return Math.ceil((end - now) / 1000)
    },
    /** Отметить вопрос не по теме; последний сверх лимита включает паузу. */
    record(key, now = Date.now()) {
      const recent = (hits.get(key) || []).filter((t) => now - t < dayMs)
      recent.push(now)
      hits.set(key, recent)
      if (recent.length >= dayLimit) until.set(key, now + cooldownMs)
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] >= dayMs) hits.delete(k)
      }
    },
  }
}
