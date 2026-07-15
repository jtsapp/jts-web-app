// Low-latency text-to-speech for the IELTS Listening scripts. ElevenLabs
// (flash model, ~tens of ms) so the "play" button is snappy.
//
// Ported from felix app/api/listening-audio/route.ts. Unconfigured → 503; the
// client then falls back to browser SpeechSynthesis so audio always plays.

export const runtime = 'nodejs'

const MAX_TEXT = 800
// "Lily — velvety": a soft, gentle voice for listening clips.
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku'
// flash v2.5 is the lowest-latency model — speed is the whole point here.
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5'
// Slightly slower than natural (range 0.7–1.2) so learners can follow.
const SPEED = Number(process.env.ELEVENLABS_SPEED) || 0.9

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const text = (body.text ?? '').trim()
  if (!text) {
    return Response.json({ error: 'Text is required.' }, { status: 400 })
  }
  if (text.length > MAX_TEXT) {
    return Response.json(
      { error: `Text is too long. Keep it under ${MAX_TEXT} chars.` },
      { status: 400 },
    )
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'ElevenLabs is not configured on the server.' },
      { status: 503 },
    )
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    DEFAULT_VOICE,
  )}?output_format=mp3_44100_128`

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        // Soft, steady narration: higher stability = calmer/less dramatic; speed
        // slightly under 1.0 so it's easier to follow.
        voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: SPEED },
      }),
    })

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '')
      return Response.json(
        {
          error: `ElevenLabs error ${upstream.status}: ${
            errText.slice(0, 200) || upstream.statusText
          }`,
        },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      )
    }

    const audio = await upstream.arrayBuffer()
    return new Response(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('ElevenLabs listening TTS failed:', e)
    return Response.json({ error: 'Failed to reach ElevenLabs.' }, { status: 502 })
  }
}

export async function GET() {
  return Response.json({ configured: Boolean(process.env.ELEVENLABS_API_KEY) })
}
