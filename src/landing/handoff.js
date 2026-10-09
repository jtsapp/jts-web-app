// Передача имени и номера с лендинга в регистрацию приложения.
//
// Лендинг и приложение — разные домены, общего localStorage у них нет, а
// класть номер телефона в адрес открытым текстом нельзя: адрес оседает в
// истории браузера, логах nginx и аналитике. Поэтому сервер лендинга
// запечатывает их AES-256-GCM в короткоживущий код, а приложение (тот же
// сервер, тот же ключ) распечатывает его через /api/landing/handoff. Без
// ключа код не прочитать и не подделать; через 30 минут он мёртв.
//
// Только сервер: node:crypto в браузер не уходит.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { cleanEnv } from './hostRouting.js'

export const HANDOFF_TTL_MS = 30 * 60 * 1000

// Свой секрет можно задать отдельно; по умолчанию — INTERNAL_API_KEY, он уже
// есть на каждом стенде, а лендинг и приложение здесь один и тот же сервер.
export function handoffSecret(env = process.env) {
  return cleanEnv(env.LANDING_HANDOFF_SECRET) || cleanEnv(env.INTERNAL_API_KEY)
}

// Ключ — производный, а не сам секрет: INTERNAL_API_KEY служит и другому
// делу, и шифровать им напрямую значило бы смешать назначения.
const keyFrom = (secret) => createHash('sha256').update('jts-landing-handoff:' + secret).digest()

/** {name, digits, lang} → код для адреса или null, если секрета нет. */
export function sealHandoff({ name, digits, lang }, secret, now = Date.now()) {
  if (!secret) return null
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const payload = JSON.stringify({ n: name, p: digits, l: lang, e: now + HANDOFF_TTL_MS })
  const body = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')
}

/** Код → {name, digits, lang} или null: чужой, испорченный, просроченный. */
export function openHandoff(token, secret, now = Date.now()) {
  if (!token || !secret || typeof token !== 'string' || token.length > 2048) return null
  try {
    const buf = Buffer.from(token, 'base64url')
    if (buf.length < 12 + 16 + 2) return null
    const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), buf.subarray(0, 12))
    decipher.setAuthTag(buf.subarray(12, 28))
    const json = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')
    const data = JSON.parse(json)
    if (!(data.e > now) || !/^\d{10}$/.test(String(data.p)) || !String(data.n || '').trim()) return null
    return { name: String(data.n).trim(), digits: String(data.p), lang: data.l === 'kz' ? 'kz' : 'ru' }
  } catch {
    return null
  }
}
