// Per-tutor text-to-speech for the frontend "listen" buttons (placement task,
// tutor-choose voice samples). Each persona keeps the SAME provider/voice the
// LiveKit agent uses (agent.py TUTOR_VOICE / SONIOX_TTS_VOICE):
//   Luna, Dexter → Gemini TTS (voices Aoede / Puck)
//   Spark        → Soniox TTS (voice Owen)
// Unconfigured (no key) → 503, and the client falls back to browser speech so a
// button always does something.

export const runtime = 'nodejs'

const MAX_TEXT = 1200

// Gemini voices per tutor key (mirror agent TUTOR_VOICE via bro/gentle personas).
const GEMINI_VOICE = { luna: 'Aoede', dexter: 'Puck' }
const GEMINI_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts'

// Soniox voice per tutor key (only Spark today, mirror agent SONIOX_TTS_VOICE).
const SONIOX_VOICE = { spark: 'Owen' }
const SONIOX_MODEL = process.env.SONIOX_TTS_MODEL || 'tts-rt-v1'
// Which tutors go through Soniox instead of Gemini.
const SONIOX_TUTORS = new Set(['spark'])
// App language ("kz") → Soniox ISO code ("kk"); en/ru pass through unchanged.
const SONIOX_LANG = { kz: 'kk' }

// Wrap raw little-endian PCM (Gemini returns 24 kHz mono 16-bit) in a WAV
// container so the browser <audio> can play it directly.
function wavFromPcm(pcm, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const blockAlign = (channels * bitsPerSample) / 8
  const byteRate = sampleRate * blockAlign
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // PCM fmt chunk size
  header.writeUInt16LE(1, 20) // audio format = PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

async function geminiTts(text, voice) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { status: 503 }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  })
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    throw new Error(`Gemini TTS ${upstream.status}: ${detail.slice(0, 200)}`)
  }
  const data = await upstream.json()
  const part = data?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data)
  const b64 = part?.inlineData?.data
  if (!b64) throw new Error('Gemini TTS returned no audio')
  return { audio: wavFromPcm(Buffer.from(b64, 'base64')), contentType: 'audio/wav' }
}

async function sonioxTts(text, voice, lang) {
  const key = process.env.SONIOX_API_KEY
  if (!key) return { status: 503 }
  const language = SONIOX_LANG[lang] || lang || 'en'
  const upstream = await fetch('https://tts-rt.soniox.com/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: SONIOX_MODEL, voice, language, text, audio_format: 'mp3' }),
  })
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    throw new Error(`Soniox TTS ${upstream.status}: ${detail.slice(0, 200)}`)
  }
  const audio = Buffer.from(await upstream.arrayBuffer())
  return { audio, contentType: 'audio/mpeg' }
}

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
    let result
    if (SONIOX_TUTORS.has(tutor)) {
      result = await sonioxTts(text, SONIOX_VOICE[tutor] || 'Owen', lang)
    } else {
      // Luna/Dexter (and any unknown tutor) → Gemini.
      result = await geminiTts(text, GEMINI_VOICE[tutor] || 'Puck')
    }
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
  return Response.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    soniox: Boolean(process.env.SONIOX_API_KEY),
  })
}
