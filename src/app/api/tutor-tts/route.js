// Per-tutor text-to-speech for the frontend "listen" buttons (placement task,
// tutor-choose voice samples). Зеркало TUTOR_PROVIDER из agent.py: у каждого
// тьютора свой провайдер, и превью обязано звучать тем же голосом, каким тьютор
// потом заговорит вживую. Сами провайдеры, голоса и откат — в lib/tutorVoice.js
// (там же их берёт озвучка помощника по сайту).
// Провайдер не настроен → откат на Soniox, как у агента; совсем без ключей →
// 503, и клиент падает на браузерный speech, чтобы кнопка всегда что-то делала.

import { providerStatus, synthTutor } from '@/lib/tutorVoice.js'

export const runtime = 'nodejs'

const MAX_TEXT = 1200

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const tutor = typeof body?.tutor === 'string' ? body.tutor.trim().toLowerCase() : ''
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : ''
  const lang = body?.lang === 'kz' ? 'kz' : body?.lang === 'ru' ? 'ru' : 'en'
  if (!text) return Response.json({ error: 'Text is required.' }, { status: 400 })

  try {
    // Провайдер не настроен на этом деплое — тот же откат, что у агента: лучше
    // чужой голос, чем молчащая кнопка «послушать».
    const result = await synthTutor(tutor, text, lang)
    if (result.status === 503) {
      return Response.json({ error: 'TTS is not configured on the server.' }, { status: 503 })
    }
    return new Response(result.audio, {
      headers: { 'Content-Type': result.contentType, 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('[tutor-tts] failed', e)
    return Response.json({ error: 'TTS failed.' }, { status: 502 })
  }
}

export async function GET() {
  return Response.json(providerStatus())
}
