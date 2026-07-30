// Per-tutor text-to-speech for the frontend "listen" buttons (placement task,
// tutor-choose voice samples). Зеркало TUTOR_TTS_PROVIDER из agent.py: у каждого
// тьютора свой провайдер, и превью обязано звучать тем же голосом, каким тьютор
// потом заговорит вживую.
//   Luna   → Google Cloud TTS, модель gemini-2.5-flash-tts, голос Aoede,
//            auth через GOOGLE_CREDENTIALS_JSON (service account) — тот же
//            продукт, что у агента в _cascade_tts_gemini (Cloud TTS, НЕ
//            Developer API с ai.google.dev).
//   Dexter → ElevenLabs, ELEVENLABS_API_KEY + ELEVEN_VOICE_ID_DEXTER.
//   Spark  → Soniox TTS (голос Owen), SONIOX_API_KEY. Единственный, кто говорит
//            по-казахски; Soniox держит один тембр на kk и en.
// Язык сессии на выбор провайдера НЕ влияет: у Луны и Декстера "kz" — это язык
// интерфейса, сами они русскоязычные и казахского текста не произносят.
// Azure тут нет: аккаунта Azure Speech у проекта нет (см. TUTOR_TTS_PROVIDER).
// Провайдер не настроен → откат на Soniox, как у агента; совсем без ключей →
// 503, и клиент падает на браузерный speech, чтобы кнопка всегда что-то делала.

import crypto from 'node:crypto'

export const runtime = 'nodejs'

const MAX_TEXT = 1200

// Gemini (Cloud TTS) voices per tutor key — mirror agent TUTOR_VOICE.
const GEMINI_VOICE = { luna: 'Aoede', dexter: 'Puck' }
const GEMINI_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-tts'
const GEMINI_HOST = process.env.GEMINI_TTS_HOST || 'https://texttospeech.googleapis.com'

// Soniox voices — mirror agent SONIOX_TTS_VOICE. Постоянно тут только Спарк;
// у Луны и Декстера свои строки на случай отката, иначе оба заговорили бы Owen.
const SONIOX_VOICE = { spark: 'Owen', dexter: 'Noah', luna: 'Grace' }
const SONIOX_MODEL = process.env.SONIOX_TTS_MODEL || 'tts-rt-v1'
const SONIOX_LANG = { kz: 'kk' } // app "kz" → Soniox ISO "kk"; en/ru pass through

// Провайдер по тьютору — mirror agent TUTOR_TTS_PROVIDER. От языка не зависит:
// по-казахски говорит только Спарк, а он и так на Soniox.
const TUTOR_PROVIDER = { luna: 'gemini', dexter: 'eleven', spark: 'soniox' }
const DEFAULT_PROVIDER = 'gemini'
const FALLBACK_PROVIDER = 'soniox'

// ElevenLabs per tutor key (только Декстер) — mirror agent ELEVEN_VOICE /
// _eleven_voice_for. Voice id живёт в env, чтобы менять тембр без деплоя;
// фолбэк — тот же id, что зашит в agent.py.
const ELEVEN_VOICE = { dexter: process.env.ELEVEN_VOICE_ID_DEXTER || 'rHWSYoq8UlV0YIBKMryp' }
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5'
// Совпадает с PERSONA_VOICE_SETTINGS["bro"] в agent.py: низкая stability +
// высокий style — иначе сленг звучит как диктор новостей.
const ELEVEN_SETTINGS = {
  dexter: { stability: 0.32, similarity_boost: 0.75, style: 0.6, use_speaker_boost: true, speed: 1.04 },
}

// Wrap raw little-endian PCM (Cloud TTS LINEAR16 = 24 kHz mono 16-bit) in a WAV
// container so the browser <audio> can play it directly.
function wavFromPcm(pcm, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const blockAlign = (channels * bitsPerSample) / 8
  const byteRate = sampleRate * blockAlign
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

// --- Google service-account OAuth (JWT-bearer) -----------------------------
// Mint an access token from the GOOGLE_CREDENTIALS_JSON service account, no SDK:
// sign an RS256 JWT with the private key and exchange it at the token endpoint.
// Cached in module scope until shortly before expiry.
let tokenCache = { token: null, exp: 0 }

function loadServiceAccount() {
  const raw = process.env.GOOGLE_CREDENTIALS_JSON
  if (!raw) return null
  let creds
  try {
    creds = JSON.parse(raw)
  } catch (e) {
    throw new Error(`GOOGLE_CREDENTIALS_JSON is not valid JSON: ${e.message}`)
  }
  if (typeof creds.private_key === 'string') {
    // Tolerate keys stored with escaped newlines.
    creds.private_key = creds.private_key.replace(/\\n/g, '\n')
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error('GOOGLE_CREDENTIALS_JSON missing client_email/private_key')
  }
  return creds
}

async function getAccessToken(creds) {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache.token && tokenCache.exp - 60 > now) return tokenCache.token
  const tokenUri = creds.token_uri || 'https://oauth2.googleapis.com/token'
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url')
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(`${header}.${claim}`)
  signer.end()
  const sig = signer.sign(creds.private_key).toString('base64url')
  const jwt = `${header}.${claim}.${sig}`
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`token exchange ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  tokenCache = { token: data.access_token, exp: now + (data.expires_in || 3600) }
  return tokenCache.token
}

async function geminiTts(text, voice) {
  const creds = loadServiceAccount()
  if (!creds) return { status: 503 }
  const token = await getAccessToken(creds)
  const upstream = await fetch(`${GEMINI_HOST}/v1/text:synthesize`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(creds.project_id ? { 'x-goog-user-project': creds.project_id } : {}),
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'en-us', name: voice, model_name: GEMINI_MODEL },
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
    }),
  })
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    throw new Error(`Gemini Cloud TTS ${upstream.status}: ${detail.slice(0, 200)}`)
  }
  const data = await upstream.json()
  const b64 = data?.audioContent
  if (!b64) throw new Error('Gemini Cloud TTS returned no audioContent')
  return { audio: wavFromPcm(Buffer.from(b64, 'base64')), contentType: 'audio/wav' }
}

async function elevenTts(text, tutor) {
  const key = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY
  const voiceId = ELEVEN_VOICE[tutor]
  // Нет ключа или нет голоса для этого тьютора → 503, вызывающий уйдёт в откат.
  if (!key || !voiceId) return { status: 503 }
  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': key },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: ELEVEN_SETTINGS[tutor],
      }),
    },
  )
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    throw new Error(`ElevenLabs TTS ${upstream.status}: ${detail.slice(0, 200)}`)
  }
  const audio = Buffer.from(await upstream.arrayBuffer())
  return { audio, contentType: 'audio/mpeg' }
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

function synth(provider, text, tutor, lang) {
  if (provider === 'soniox') return sonioxTts(text, SONIOX_VOICE[tutor] || 'Owen', lang)
  if (provider === 'eleven') return elevenTts(text, tutor)
  return geminiTts(text, GEMINI_VOICE[tutor] || 'Puck')
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
    const provider = TUTOR_PROVIDER[tutor] || DEFAULT_PROVIDER
    let result = await synth(provider, text, tutor, lang)
    // Провайдер не настроен на этом деплое — тот же откат, что у агента: лучше
    // чужой голос, чем молчащая кнопка «послушать».
    if (result.status === 503 && provider !== FALLBACK_PROVIDER) {
      result = await synth(FALLBACK_PROVIDER, text, tutor, lang)
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
    gemini: Boolean(process.env.GOOGLE_CREDENTIALS_JSON),
    soniox: Boolean(process.env.SONIOX_API_KEY),
    eleven: Boolean(process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY),
  })
}
