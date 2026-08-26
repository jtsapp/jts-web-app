// Per-tutor text-to-speech for the frontend "listen" buttons (placement task,
// tutor-choose voice samples). Зеркало TUTOR_TTS_PROVIDER из agent.py: у каждого
// тьютора свой провайдер, и превью обязано звучать тем же голосом, каким тьютор
// потом заговорит вживую.
//   Luna   → Google Cloud TTS, модель gemini-2.5-flash-tts, голос Aoede,
//            auth через GOOGLE_CREDENTIALS_JSON (service account) — тот же
//            продукт, что у агента в _cascade_tts_gemini (Cloud TTS, НЕ
//            Developer API с ai.google.dev).
//   Dexter → ElevenLabs, ELEVENLABS_API_KEY + ELEVEN_VOICE_ID_DEXTER.
//   Spark  → Soniox TTS (голос Owen), SONIOX_API_KEY. Soniox держит один тембр
//            на kk и en. По-казахски говорят двое — он и Джарвис.
//   Jarvis → ВРЕМЕННО OpenAI TTS (gpt-4o-mini-tts, голос ash), OPENAI_API_KEY.
//            Тьютор dev-only (JARVIS_ENABLED в src/config.js) — на нём и
//            перебираем голоса; путь Fish Audio (FISH_AUDIO_API_KEY +
//            reference_id клона) остался рабочим, возврат — строкой в
//            TUTOR_PROVIDER. Роут общий: на проде Джарвиса некому позвать.
// Язык сессии на выбор провайдера НЕ влияет: у Луны и Декстера "kz" — это язык
// интерфейса, сами они русскоязычные и казахского текста не произносят.
// Azure тут нет: аккаунта Azure Speech у проекта нет (см. TUTOR_TTS_PROVIDER).
// Провайдер не настроен → откат на Soniox, как у агента; совсем без ключей →
// 503, и клиент падает на браузерный speech, чтобы кнопка всегда что-то делала.

import crypto from 'node:crypto'

import { normalizeForSpeech, openaiInstructions, openaiSpeed } from '../../../tutor/openaiTtsStyle.js'

export const runtime = 'nodejs'

const MAX_TEXT = 1200

// Gemini (Cloud TTS) voices per tutor key — mirror agent TUTOR_VOICE.
const GEMINI_VOICE = { luna: 'Aoede', dexter: 'Puck' }
const GEMINI_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-tts'
const GEMINI_HOST = process.env.GEMINI_TTS_HOST || 'https://texttospeech.googleapis.com'

// Soniox voices — mirror agent SONIOX_TTS_VOICE. Постоянно тут только Спарк;
// у Луны и Декстера свои строки на случай отката, иначе оба заговорили бы Owen.
// Ключи с суффиксом -harsh — жёсткий нрав тьютора (ось 18+): тот же голос, тот
// же провайдер. Алиасы нужны потому, что кнопка «послушать» и генератор визиток
// зовут тьютора именно суффиксным ключом.
const SONIOX_VOICE = { spark: 'Owen', dexter: 'Noah', luna: 'Grace', 'spark-harsh': 'Owen' }
const SONIOX_MODEL = process.env.SONIOX_TTS_MODEL || 'tts-rt-v1'
const SONIOX_LANG = { kz: 'kk' } // app "kz" → Soniox ISO "kk"; en/ru pass through

// Провайдер по тьютору — mirror agent TUTOR_TTS_PROVIDER. От языка не зависит:
// тьютор озвучивается своим голосом всегда.
const TUTOR_PROVIDER = {
  luna: 'gemini',
  dexter: 'eleven',
  spark: 'soniox',
  jarvis: 'openai', // ВРЕМЕННО вместо 'fish' — перебираем голоса на dev-тьюторе
  'dexter-harsh': 'eleven',
  'spark-harsh': 'soniox',
  'jarvis-harsh': 'openai',
}
const DEFAULT_PROVIDER = 'gemini'
const FALLBACK_PROVIDER = 'soniox'

// ElevenLabs per tutor key (только Декстер) — mirror agent ELEVEN_VOICE /
// _eleven_voice_for. Voice id живёт в env, чтобы менять тембр без деплоя;
// фолбэк — тот же id, что зашит в agent.py.
const DEXTER_VOICE_ID = process.env.ELEVEN_VOICE_ID_DEXTER || 'rHWSYoq8UlV0YIBKMryp'
const ELEVEN_VOICE = { dexter: DEXTER_VOICE_ID, 'dexter-harsh': DEXTER_VOICE_ID }
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5'
// Совпадает с PERSONA_VOICE_SETTINGS["bro"] в agent.py: низкая stability +
// высокий style — иначе сленг звучит как диктор новостей.
const DEXTER_ELEVEN_SETTINGS = {
  stability: 0.32,
  similarity_boost: 0.75,
  style: 0.6,
  use_speaker_boost: true,
  speed: 1.04,
}
const ELEVEN_SETTINGS = {
  dexter: DEXTER_ELEVEN_SETTINGS,
  'dexter-harsh': DEXTER_ELEVEN_SETTINGS,
}

// Fish Audio (только Джарвис) — mirror agent FISH_TTS_VOICE. Голос задаётся
// reference_id клонированной модели, а не именем из каталога, поэтому и env, и
// фолбэк — это хэш, а не «Owen»/«Puck».
const FISH_VOICE = {
  jarvis: process.env.FISH_VOICE_ID_JARVIS || 'c47719f52ce34cc193b9bc2f00565e8a',
}
// s2.1-pro — дефолт и у самого Fish, и у livekit-плагина, и цена у всех трёх
// моделей одна ($15/1M UTF-8 байт), так что брать s1 смысла нет. Переключается
// переменной FISH_TTS_MODEL: s1 | s2-pro | s2.1-pro.
const FISH_MODEL = process.env.FISH_TTS_MODEL || 's2.1-pro'

// OpenAI TTS (сейчас Джарвис) — mirror agent OPENAI_TTS_VOICE / OPENAI_TTS_MODEL
// / OPENAI_TTS_PERSONA_STYLE / OPENAI_TTS_LIVENESS / OPENAI_TTS_PRONUNCIATION.
// Голос — имя пресета из каталога, всё остальное правится только ТЕКСТОМ:
// настроек вроде stability/style у провайдера нет.
//
// Голос один на оба нрава (ключ jarvis), подача разная (ключи jarvis /
// jarvis-harsh) — та же развилка, что у агента: тембр по базовому id, тон по
// персоне с нравом.
const OPENAI_VOICE = {
  jarvis: process.env.OPENAI_TTS_VOICE_JARVIS || 'ash',
}
// gpt-4o-mini-tts, а не tts-1: только он принимает instructions.
const OPENAI_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'
// Характер, живость, произношение и темп живут в общем модуле: их же читает
// офлайн-генератор визиток (scripts/make-tutor-voice-samples.js), и две копии
// одного текста разъехались бы на первой же правке интонации.
const OPENAI_KEY = () => process.env.OPENAI_API_KEY || process.env.OpenAI_API_KEY || ''

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

async function fishTts(text, voice) {
  const key = process.env.FISH_AUDIO_API_KEY
  if (!key) return { status: 503 }
  const upstream = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
      // Модель едет ЗАГОЛОВКОМ, а не полем тела — так устроен их API.
      model: FISH_MODEL,
    },
    body: JSON.stringify({
      text,
      reference_id: voice,
      format: 'mp3',
      mp3_bitrate: 128,
      // balanced, а не low: тут озвучивается готовый текст целиком, гнаться за
      // первым чанком незачем, а на low слышны артефакты.
      latency: 'balanced',
    }),
  })
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    // 402 — «кончился API-кредит», и это НЕ ошибка запроса: ключ рабочий, текст
    // валиден, платить просто нечем. Вместе с 401 (ключ отозвали) и 429 (упёрлись
    // в лимит) это ровно тот случай, для которого в POST уже есть откат на
    // Soniox — иначе кнопка «послушать» у Джарвиса молчит до пополнения счёта.
    if ([401, 402, 429].includes(upstream.status)) {
      console.warn(`[tutor-tts] fish unavailable (${upstream.status}): ${detail.slice(0, 200)}`)
      return { status: 503 }
    }
    throw new Error(`Fish Audio TTS ${upstream.status}: ${detail.slice(0, 200)}`)
  }
  const audio = Buffer.from(await upstream.arrayBuffer())
  return { audio, contentType: 'audio/mpeg' }
}

async function openaiTts(text, tutor, lang) {
  const key = OPENAI_KEY()
  if (!key) return { status: 503 }
  const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      // Голос по БАЗОВОМУ ключу: нрав меняет подачу, а не тембр.
      voice: OPENAI_VOICE[tutor.replace(/-harsh$/, '')] || OPENAI_VOICE.jarvis,
      // Разметку снимаем и цифры разворачиваем словами — иначе синтез читает
      // звёздочку вслух, а число на языке, который угадал сам.
      input: normalizeForSpeech(text, lang),
      instructions: openaiInstructions(tutor, lang),
      speed: openaiSpeed(tutor),
      response_format: 'mp3',
    }),
  })
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    // Та же логика, что у Fish: 401 (ключ отозвали), 429 (лимит) и 402 (кончились
    // деньги на счету) — не ошибка запроса, а «провайдера сейчас нет». Отдаём
    // 503, чтобы POST откатился на Soniox и кнопка «послушать» не молчала.
    if ([401, 402, 429].includes(upstream.status)) {
      console.warn(`[tutor-tts] openai unavailable (${upstream.status}): ${detail.slice(0, 200)}`)
      return { status: 503 }
    }
    throw new Error(`OpenAI TTS ${upstream.status}: ${detail.slice(0, 200)}`)
  }
  const audio = Buffer.from(await upstream.arrayBuffer())
  return { audio, contentType: 'audio/mpeg' }
}

function synth(provider, text, tutor, lang) {
  if (provider === 'soniox') return sonioxTts(text, SONIOX_VOICE[tutor] || 'Owen', lang)
  if (provider === 'eleven') return elevenTts(text, tutor)
  if (provider === 'fish') return fishTts(text, FISH_VOICE[tutor] || FISH_VOICE.jarvis)
  if (provider === 'openai') return openaiTts(text, tutor, lang)
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
    fish: Boolean(process.env.FISH_AUDIO_API_KEY),
    openai: Boolean(OPENAI_KEY()),
  })
}
