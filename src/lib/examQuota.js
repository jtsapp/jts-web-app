// Демо-доступ и квоты экзаменов IELTS и SAT (SAT-SYNC-PLAN E2). Бэкенд держит лимит в ContentQuotaService и при
// исчерпании отвечает 403 { messages: [текст], code: 'CONTENT_QUOTA_EXCEEDED', contentType, limit, used, demoExpired }
// (api.js кладёт поля в ошибку). Закрытый доступ (SatAccessInterceptor) — тоже 403, но без code: их различаем по нему.
// Дневные лимиты Next-роутов отвечают 429 — это тоже исчерпание, а не поломка.

export const QUOTA_CODE = 'CONTENT_QUOTA_EXCEEDED'

/** Отказ — исчерпанная квота (а не сеть, не 500 и не «нет доступа»). */
export function isQuotaError(e) {
  if (!e) return false
  if (e.code === QUOTA_CODE) return true
  return e.status === 429
}

/**
 * Текст для ученика: исчерпанная квота — текст сервера (он уже по-человечески), иначе подпись по типу контента;
 * остальное — серверный текст или общий «нет связи». Никогда не пустая строка и не «Ошибка сервера (500)».
 */
export function errorText(e, t, { fallback = 'sat.study.netError' } = {}) {
  if (isQuotaError(e)) {
    if (e.serverMessage) return e.serverMessage
    if (e.demoExpired) return t('exam.quota.expired')
    const key = e.contentType ? `exam.quota.type.${e.contentType}` : null
    const s = key ? t(key, { n: String(e.limit ?? '') }) : null
    return s && s !== key ? s : t('exam.quota.text')
  }
  return e?.serverMessage || t(fallback)
}

/** Строки плашки демо: только ограниченные типы, в порядке сервера. usage — ответ /mobile/content-quota/usage. */
export function usageRows(usage) {
  return (Array.isArray(usage) ? usage : [])
    .filter((u) => u && u.limit != null)
    .map((u) => ({ ...u, remaining: u.remaining ?? Math.max(0, u.limit - (u.used || 0)) }))
}
