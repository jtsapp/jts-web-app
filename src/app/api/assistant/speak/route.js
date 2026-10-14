// Озвучка ответа помощника по сайту — голосом Луны, как в её звонке (Gemini
// Cloud TTS, «Aoede»): помощник на сайте — это Луна. Синтез общий с
// /api/tutor-tts (lib/tutorVoice.js), чтобы голос не разъехался с тьютором.
//
// Казахского у Gemini нет — казахская фраза сразу идёт в Soniox «Grace» (тот
// же откатный голос Луны, что у агента). Любой сбой Gemini — тоже в Soniox:
// квота Gemini общая со звонками Луны, и ответ помощника не должен молчать
// из-за того, что её съел звонок.
//
// Только для вошедшего ученика и с лимитом: синтез платный, а ответ на один
// вопрос — 2–4 фразы (чат пускает 20 вопросов за 10 минут).

import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { synth } from '@/lib/tutorVoice.js'
import { createRateLimiter } from '@/lib/assistant/rateLimit.js'

export const runtime = 'nodejs'
export const MAX_TEXT = 600

const takeQuota = createRateLimiter({ windowLimit: 100, dayLimit: 800 })
const KK_LETTERS = /[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/
const json = (status, body, headers = {}) => Response.json(body, { status, headers })

/** Язык фразы для голоса: казахские буквы или казахский интерфейс — kk. */
export function voiceLang(text, lang) {
  if (lang === 'kk' || KK_LETTERS.test(String(text || ''))) return 'kk'
  return lang === 'en' ? 'en' : 'ru'
}

async function trySynth(provider, text, lang) {
  try {
    const r = await synth(provider, text, 'luna', lang)
    return r?.audio ? r : null
  } catch (e) {
    console.warn(`[assistant-speak] ${provider} failed:`, e?.message || e)
    return null
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
  let voice = 'soniox'
  let result = null
  if (lang !== 'kk') {
    result = await trySynth('gemini', text, lang)
    if (result) voice = 'gemini'
  }
  result ??= await trySynth('soniox', text, lang)
  if (!result) {
    // Звука не было — и фраза не должна съесть лимит ученика.
    takeQuota.refund(key)
    return json(502, { error: 'tts_failed' })
  }
  return new Response(result.audio, {
    headers: { 'content-type': result.contentType, 'cache-control': 'no-store', 'x-assistant-voice': voice },
  })
}
