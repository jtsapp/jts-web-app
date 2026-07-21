// Speech-to-text for the IELTS Speaking Part 1 answers.
//
// Ported from felix app/api/transcribe/route.ts, but on Azure Speech instead of
// Gemini STT: this app has no Gemini key, and the Speech SDK is already a
// dependency for the pronunciation path. Same contract: multipart 'audio' in,
// { text } out. Unconfigured → 503; the Speaking screen still advances with an
// empty transcript.

import { transcribeWav } from '@/lib/ielts/azure-pronunciation.js'
import { transcribeWavSoniox, isSonioxConfigured } from '@/lib/soniox-stt.js'

export const runtime = 'nodejs'
// Soniox async — upload+poll+fetch; даём запас по времени сверх дефолтных 10с.
export const maxDuration = 30

// 16 kHz mono WAV runs ~32 KB/s, so 10 MB covers ~5 min — well beyond the short
// clips the recorder produces, while still rejecting runaway uploads.
const MAX_BYTES = 10 * 1024 * 1024

// STT берём с Soniox (AZURE_SPEECH_KEY на проде не задан). Azure оставлен
// фолбэком: если однажды заведут Azure и снимут Soniox — маршрут не сломается.
function isConfigured() {
  return (
    isSonioxConfigured() ||
    Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)
  )
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
    const text = isSonioxConfigured()
      ? await transcribeWavSoniox(buf)
      : await transcribeWav(buf)
    return Response.json({ text })
  } catch (e) {
    console.error('[transcribe] failed', e)
    return Response.json({ error: 'Speech-to-text failed. Try again.' }, { status: 502 })
  }
}
