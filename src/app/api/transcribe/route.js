// Speech-to-text for the IELTS Speaking Part 1 answers.
//
// Ported from felix app/api/transcribe/route.ts, but on Azure Speech instead of
// Gemini STT: this app has no Gemini key, and the Speech SDK is already a
// dependency for the pronunciation path. Same contract: multipart 'audio' in,
// { text } out. Unconfigured → 503; the Speaking screen still advances with an
// empty transcript.

import { transcribeWav, transcribeWavFast } from '@/lib/ielts/azure-pronunciation.js'
import { transcribeWavSoniox, isSonioxConfigured } from '@/lib/soniox-stt.js'

export const runtime = 'nodejs'
// maxDuration тут больше нет: это понятие Vercel, а мы под `next start` в
// Docker — оно не ограничивало ничего и только вводило в заблуждение (стояло
// 30, хотя уровневый тест — монолог на 2–5 минут и дольше). Реальные лимиты
// заданы явно: AbortController в transcribeWavFast и бюджет по длине аудио в
// transcribeWav / transcribeWavSoniox.

// 16 кГц mono WAV = ~32 КБ/с, значит 25 МБ ≈ 13 минут речи: ученик может
// говорить сколько хочет, а мусорная заливка всё ещё отсекается.
//
// ВАЖНО: этот лимит должен быть НИЖЕ, чем client_max_body_size у nginx перед
// приложением. Дефолтный nginx'овый 1 МБ = 32 секунды речи, и ответ длиннее
// умирал с 413 ещё до Next.js — ровно на это жаловались ученики. На прокси
// нужно client_max_body_size 32m (и proxy_read_timeout 300s).
const MAX_BYTES = 25 * 1024 * 1024

// Приоритет — Azure: и тест уровня, и IELTS Speaking английские, а на этом же
// ключе уже сидит оценка произношения, так что два провайдера на один экран
// не нужны. Soniox остаётся фолбэком (и единственным вариантом там, где надо
// распознать казахский — голосовой тьютор, у него свой стек в agent/).
function isAzureConfigured() {
  return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)
}

function isConfigured() {
  return isAzureConfigured() || isSonioxConfigured()
}

export async function GET() {
  return Response.json({ configured: isConfigured() })
}

export async function POST(request) {
  if (!isConfigured()) {
    return Response.json(
      { error: 'Speech-to-text is not configured on the server.' },
      { status: 503 },
    )
  }

  let form
  try {
    form = await request.formData()
  } catch {
    return Response.json(
      { error: "Expected multipart/form-data with an 'audio' file." },
      { status: 400 },
    )
  }

  const file = form.get('audio')
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'audio' file field." }, { status: 400 })
  }
  if (file.size === 0) {
    return Response.json({ error: 'Audio file is empty.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `Audio too large. Keep it under ${Math.floor(MAX_BYTES / (1024 * 1024))} MB.` },
      { status: 413 },
    )
  }

  const mimeType = file.type || 'audio/wav'
  if (!mimeType.startsWith('audio/')) {
    return Response.json({ error: `Unsupported content type: ${mimeType}` }, { status: 415 })
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    let text
    if (isAzureConfigured()) {
      // Fast Transcription отдаёт длинный ответ целиком за секунды, но живёт
      // не во всех регионах (centralus — нет, eastus — да). Пробуем её, а на
      // null уходим в потоковый SDK: он медленнее, зато работает везде.
      text = (await transcribeWavFast(buf)) ?? (await transcribeWav(buf))
    } else {
      text = await transcribeWavSoniox(buf)
    }
    return Response.json({ text })
  } catch (e) {
    console.error('[transcribe] failed', e)
    return Response.json({ error: 'Speech-to-text failed. Try again.' }, { status: 502 })
  }
}
