// Серверная часть формы «Получить консультацию»: проверка, лимит частоты и
// отправка заявки в бэкенд (amoCRM). Отдельно от lead.js — тот уходит в
// браузерный бандл формы.
import { phoneDigits, isPhoneComplete } from './lead.js'
import { cleanEnv } from './hostRouting.js'

export const NAME_MAX = 100
export const GOAL_MAX = 64

/** Тело запроса формы → {ok, lead} или {ok:false, error}. */
export function validateLead(body) {
  const name = String(body?.name ?? '').trim()
  if (!name || name.length > NAME_MAX) return { ok: false, error: 'name' }
  const digits = phoneDigits(String(body?.phone ?? ''))
  if (!isPhoneComplete(digits)) return { ok: false, error: 'phone' }
  const goal = String(body?.goal ?? '').trim().slice(0, GOAL_MAX)
  const lang = body?.lang === 'kz' ? 'kz' : 'ru'
  return { ok: true, lead: { name, digits, goal, lang } }
}

// Лимит заявок с одного адреса: форма открытая, и без него бот за минуту
// завалил бы CRM. Пять за десять минут — живому человеку с опечаткой хватит.
// Память процесса, а не база: контейнер у приложения один, а лимит
// сбрасывается вместе с ним — это допустимо.
export function createRateLimiter({ max = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const hits = new Map()
  return function allow(key, now = Date.now()) {
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      hits.set(key, recent)
      return false
    }
    recent.push(now)
    hits.set(key, recent)
    // Старые адреса не копим бесконечно.
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
    return true
  }
}

/**
 * Заявка в бэкенд: POST /landing/leads с ключом X-Landing-Key.
 * Никогда не бросает — форма своё дело сделала, и человека ждёт регистрация;
 * не ушло здесь — бэкенд всё равно заведёт сделку «Саморегистрация», когда
 * он зарегистрируется.
 */
export async function sendLeadToCrm(lead, { backendUrl, key, fetchImpl = fetch, timeoutMs = 8000 }) {
  if (!key) return { sent: false, reason: 'no_key' }
  try {
    const res = await fetchImpl(`${backendUrl}/landing/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Landing-Key': key },
      body: JSON.stringify({ name: lead.name, phone: '7' + lead.digits, goal: lead.goal || null, lang: lead.lang }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    return res.ok ? { sent: true } : { sent: false, reason: 'status_' + res.status }
  } catch (e) {
    return { sent: false, reason: e?.name === 'TimeoutError' ? 'timeout' : 'network' }
  }
}

export function leadKey(env = process.env) {
  return cleanEnv(env.LANDING_LEAD_KEY)
}

// В логах номер — без середины: заявку найти по нему можно, а лог не
// становится выгрузкой контактов.
export const maskPhone = (digits) => String(digits).replace(/^(\d{3})\d+(\d{2})$/, '$1•••••$2')
