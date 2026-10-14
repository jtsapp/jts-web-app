// Распознавание голосового вопроса помощнику по сайту. Отдельно от
// /api/transcribe: тот настроен на английскую речь теста уровня и IELTS, а
// помощника спрашивают по-русски и по-казахски, вставляя английские слова из
// задания. И он только для вошедшего ученика, с лимитом: распознавание платное.
//
// Сначала Soniox — он держит смешанную речь в одной фразе и понимает казахский
// с подсказкой терминов сайта (lib/assistant/sttContext.js). На 429 Soniox
// молча отдаёт '' (лимит в минуту общий со звонками тьюторов) — тогда Azure с
// локалью интерфейса. Запись нигде не сохраняется и в лог не пишется.

import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { isSonioxConfigured, transcribeWavSoniox } from '@/lib/soniox-stt.js'
import { transcribeWav, transcribeWavFast } from '@/lib/ielts/azure-pronunciation.js'
import { createRateLimiter } from '@/lib/assistant/rateLimit.js'
import { azureLocale, sttContext, sttLanguages } from '@/lib/assistant/sttContext.js'

export const runtime = 'nodejs'

// 30 с WAV 16 кГц mono ≈ 960 КБ плюс запас. Больше не нужно и нельзя: на
// прод-домене nginx мог остаться с лимитом тела 1 МБ (≈ 32 с речи).
export const MAX_BYTES = 1_200_000
// Вопрос короткий: ждать распознавания дольше — ученик решит, что его не услышали.
const STT_TIMEOUT_MS = 20_000

const takeQuota = createRateLimiter()
const json = (status, body, headers = {}) => Response.json(body, { status, headers })
const azureConfigured = () => Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)
const field = (form, name) => {
  const v = form.get(name)
  return typeof v === 'string' ? v : ''
}

export async function POST(request) {
  const auth = await verifyTokenStatus(bearerFromRequest(request))
  if (auth.status === 'unavailable') return json(503, { error: 'backend_unavailable' })
  if (auth.status !== 'ok') return json(401, { error: 'unauthorized' })
  if (!isSonioxConfigured() && !azureConfigured()) return json(503, { error: 'stt_unavailable' })

  let form
  try {
    form = await request.formData()
  } catch {
    return json(400, { error: 'bad_request' })
  }
  const file = form.get('audio')
  if (!(file instanceof File) || file.size === 0) return json(400, { error: 'bad_request' })
  if (file.size > MAX_BYTES) return json(413, { error: 'too_large' })

  const key = `user-${auth.user.userId}`
  const quota = takeQuota(key)
  if (!quota.ok) {
    return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, {
      'retry-after': String(quota.retryAfterSec),
    })
  }

  const lang = ['ru', 'kk', 'en'].includes(field(form, 'lang')) ? field(form, 'lang') : 'ru'
  const screenId = field(form, 'screen').slice(0, 64) || null
  const wav = Buffer.from(await file.arrayBuffer())

  let text = ''
  let engine = 'none'
  if (isSonioxConfigured()) {
    engine = 'soniox'
    text = await transcribeWavSoniox(wav, {
      lang: sttLanguages(lang),
      context: sttContext({ screenId }),
      timeoutMs: STT_TIMEOUT_MS,
    }).catch(() => '')
  }
  if (!String(text || '').trim() && azureConfigured()) {
    engine = 'azure'
    const locale = azureLocale(lang)
    const fast = await transcribeWavFast(wav, { locale, timeoutMs: STT_TIMEOUT_MS }).catch(() => null)
    text = fast ?? (await transcribeWav(wav, { locale }).catch(() => ''))
  }
  text = String(text || '').trim()
  // В лог — чем распознали и сколько, но не что сказал ученик.
  console.info('[assistant-stt]', JSON.stringify({ engine, lang, bytes: file.size, chars: text.length }))
  return json(200, { text })
}
