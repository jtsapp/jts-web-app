// Озвучка ответа помощника по сайту — голосом Луны, как в её звонке (Gemini
// Cloud TTS, «Aoede»): помощник на сайте — это Луна. Синтез общий с
// /api/tutor-tts (lib/tutorVoice.js), чтобы голос не разъехался с тьютором.
//
// Язык Gemini — по фразе (ru-RU / en-US), а не зашитый en-us тьюторов: иначе
// «0%» в русском ответе звучит «zero percent».
//
// Запасного голоса здесь нет — его берёт клиент (voiceQueue.js) потоковым
// /api/tts. Раньше сервер сам подставлял Soniox, но в этом пути Soniox собирает
// фразу целиком: 10–12 с на 190 символов (замер на дев-стенде 14.10.2026), и
// посреди ответа вставала долгая тишина, а следом звучал чужой голос. Казахская
// фраза (у Gemini казахского нет) сюда обычно не доходит — клиент сразу играет
// её потоком; путь Soniox оставлен на случай, когда казахские буквы попали в
// ответ, начатый по-русски.
//
// Только для вошедшего ученика и с лимитом: синтез платный, а ответ на один
// вопрос — 2–4 фразы (чат пускает 20 вопросов за 10 минут).

import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { synth, synthGemini } from '@/lib/tutorVoice.js'
import { createRateLimiter } from '@/lib/assistant/rateLimit.js'

export const runtime = 'nodejs'
export const MAX_TEXT = 600
// Gemini не потоковый: фраза приходит целиком, примерно 1.5 с + 40 мс на
// символ (75 символов — 4.4 с, 190 — 8–10 с, замер 14.10.2026). Срок — на
// настоящее зависание, а не на длинную фразу: прежние 8 с выбрасывали готовый
// звук за секунду до конца.
export const SYNTH_TIMEOUT_MS = 20_000

const LUNA_VOICE = 'Aoede'
const GEMINI_LOCALE = { ru: 'ru-RU', en: 'en-US' }

const takeQuota = createRateLimiter({ windowLimit: 100, dayLimit: 800 })
const KK_LETTERS = /[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/
const json = (status, body, headers = {}) => Response.json(body, { status, headers })

/**
 * Язык фразы для голоса: казахские буквы — kk; lang 'kk' — клиент закрепил
 * казахский за всем ответом (его первая фраза была казахской, voiceQueue.js).
 */
export function voiceLang(text, lang) {
  if (lang === 'kk' || KK_LETTERS.test(String(text || ''))) return 'kk'
  return lang === 'en' ? 'en' : 'ru'
}

async function withTimeout(promise, label) {
  let timer
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}: timeout ${SYNTH_TIMEOUT_MS} ms`)), SYNTH_TIMEOUT_MS)
    })
    const r = await Promise.race([promise, timeout])
    return r?.audio ? r : null
  } catch (e) {
    console.warn('[assistant-speak]', e?.message || e)
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(request) {
  const auth = await verifyTokenStatus(bearerFromRequest(request))
  if (auth.status === 'unavailable') return json(503, { error: 'backend_unavailable' })
  if (auth.status !== 'ok') return json(401, { error: 'unauthorized' })

  let body
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'bad_request' })
  }
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : ''
  if (!text) return json(400, { error: 'bad_request' })

  const key = `user-${auth.user.userId}`
  const quota = takeQuota(key)
  if (!quota.ok) {
    return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, {
      'retry-after': String(quota.retryAfterSec),
    })
  }

  const lang = voiceLang(text, body?.lang)
  const voice = lang === 'kk' ? 'soniox' : 'gemini'
  const result =
    lang === 'kk'
      ? await withTimeout(synth('soniox', text, 'luna', 'kk'), 'soniox')
      : await withTimeout(synthGemini(text, { voice: LUNA_VOICE, languageCode: GEMINI_LOCALE[lang] }), 'gemini')
  if (!result) {
    // Звука не было — и фраза не должна съесть лимит ученика.
    takeQuota.refund(key)
    return json(502, { error: 'tts_failed' })
  }
  return new Response(result.audio, {
    headers: { 'content-type': result.contentType, 'cache-control': 'no-store', 'x-assistant-voice': voice },
  })
}
