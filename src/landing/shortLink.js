// Короткая ссылка рекламы (justtostudy-english.kz/имя): серверная часть.
// Бэкенд по имени отдаёт UTM-метки ссылки и считает переход; здесь из них
// собирается адрес лендинга. Метки едут в адресе, как у длинной ссылки: их
// подхватывают форма заявки, кнопка в приложение и Meta Pixel.
import { UTM_KEYS, pickUtm } from '../lib/attribution.js'

/**
 * Метки ссылки ({ utm_source: … }) или null: ссылки нет, она выключена, нет
 * ключа, бэкенд не ответил. Никогда не бросает — человек в любом случае
 * попадёт на лендинг, пусть и без меток.
 */
export async function resolveShortLink(slug, { backendUrl, key, fetchImpl = fetch, timeoutMs = 3000 }) {
  if (!key) return null
  try {
    const res = await fetchImpl(`${backendUrl}/landing/short-links/${encodeURIComponent(slug)}/visit`, {
      method: 'POST',
      headers: { 'X-Landing-Key': key },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const body = await res.json().catch(() => null)
    const utm = pickUtm(body?.utm && typeof body.utm === 'object' ? body.utm : {})
    return Object.keys(utm).length ? utm : null
  } catch {
    return null
  }
}

/**
 * Адрес лендинга после короткой ссылки: метки ссылки поверх меток адреса
 * (чужие utm_* из адреса отброшены, остальное — fbclid от Instagram и т.п. —
 * сохраняется).
 */
export function shortLinkTarget(utm, search = '') {
  const sp = new URLSearchParams(search)
  if (utm) {
    for (const key of UTM_KEYS) sp.delete(key)
    for (const [key, value] of Object.entries(utm)) sp.set(key, value)
  }
  const query = sp.toString()
  return query ? `/?${query}` : '/'
}
