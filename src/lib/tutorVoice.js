// Голоса тьюторов для веба: кнопки «послушать», визитки и озвучка ответа
// помощника по сайту (он — Луна). Вынесено из /api/tutor-tts, чтобы голос
// Луны на сайте и в её звонке не разъехался: один код, одни голоса.
//
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
//            на kk и en.
//   Jarvis → ElevenLabs, клон 2ZqnRUaCU5IaXJ45uakV, модель eleven_v3 (казахский
//            есть только у неё). Свой ключ — ELEVENLABS_API_KEY_JARVIS, если
//            клон живёт в другом кабинете. Пути soniox/openai/fish рабочие:
//            вернуть — TTS_PROVIDER_JARVIS. Тьютор dev-only (JARVIS_ENABLED).
//   Aizere → ElevenLabs, свой клон «zere» (до 01.10.2026 — клон Jarvis),
//            модель eleven_v4_turbo — казахский есть, вдвое дешевле v4.
//            Свой ключ — ELEVENLABS_API_KEY_AIZERE, иначе общий.
//            В проде с 03.10.2026 — ключ нужен и прод-окружению.
// Язык сессии на выбор провайдера НЕ влияет: у Луны и Декстера "kz" — это язык
// интерфейса, сами они русскоязычные и казахского текста не произносят.
// Azure тут нет: аккаунта Azure Speech у проекта нет (см. TUTOR_TTS_PROVIDER).
// Провайдер не настроен → откат на Soniox, как у агента; совсем без ключей →
// 503, и клиент падает на браузерный speech, чтобы кнопка всегда что-то делала.

import crypto from 'node:crypto'

import { normalizeForSpeech, openaiInstructions, openaiSpeed } from '../tutor/openaiTtsStyle.js'

// Gemini (Cloud TTS) voices per tutor key — mirror agent TUTOR_VOICE.
const GEMINI_VOICE = { luna: 'Aoede', dexter: 'Puck' }
const GEMINI_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-tts'
const GEMINI_HOST = process.env.GEMINI_TTS_HOST || 'https://texttospeech.googleapis.com'

// Soniox voices — mirror agent SONIOX_TTS_VOICE. Постоянно тут только Спарк;
// у Луны и Декстера свои строки на случай отката, иначе оба заговорили бы Owen.
// Ключи с суффиксом -harsh — жёсткий нрав тьютора (ось 18+): тот же голос, тот
// же провайдер. Алиасы нужны потому, что кнопка «послушать» и генератор визиток
// зовут тьютора именно суффиксным ключом.
// KZ-стенд (jarvis) сидит на Daniel, а не на Owen: Owen — тембр Спарка, и стенд
// не должен звучать его двойником.
const SONIOX_VOICE = {
  spark: 'Owen',
  dexter: 'Noah',
  luna: 'Grace',
  'spark-harsh': 'Owen',
  jarvis: 'Daniel',
  'jarvis-harsh': 'Daniel',
  // Айзере — только откат: женский голос, иначе дефолтный Owen сделал бы из неё Спарка.
  aizere: 'Maya',
  // «Спарк тест» (dev-only) звучит живым Спарком — сессию агент берёт его же.
  sparktest: 'Owen',
}
const SONIOX_MODEL = process.env.SONIOX_TTS_MODEL || 'tts-rt-v1'
const SONIOX_LANG = { kz: 'kk' } // app "kz" → Soniox ISO "kk"; en/ru pass through
// Темп — единственная ручка подачи у Soniox (диапазон [0.7–1.3]), зеркало
// SONIOX_TTS_SPEED в agent.py. Спарка тут нет намеренно: живьём он идёт на
// дефолтной единице, и трогать прод-тьютора заодно со стендом нельзя.
const SONIOX_SPEED = { jarvis: 0.95, 'jarvis-harsh': 0.95 }
const DEFAULT_SONIOX_SPEED = 1.0

// Провайдер по тьютору — mirror agent TUTOR_TTS_PROVIDER. От языка не зависит:
// тьютор озвучивается своим голосом всегда.
export const TUTOR_PROVIDER = {
  luna: 'gemini',
  dexter: 'eleven',
  spark: 'soniox',
  jarvis: 'eleven', // KZ-стенд: клон ElevenLabs, казахский только на v3
  'dexter-harsh': 'eleven',
  'spark-harsh': 'soniox',
  'jarvis-harsh': 'eleven',
  aizere: 'eleven', // свой клон «zere», v4 Turbo
  sparktest: 'soniox', // dev-стенд нового Спарка — голос живого Спарка
}
export const DEFAULT_PROVIDER = 'gemini'
export const FALLBACK_PROVIDER = 'soniox'

// ElevenLabs per tutor key — mirror agent ELEVEN_VOICE / _eleven_voice_for.
// Voice id живёт в env, чтобы менять тембр без деплоя; фолбэк — тот же id,
// что зашит в agent.py.
const DEXTER_VOICE_ID = process.env.ELEVEN_VOICE_ID_DEXTER || 'rHWSYoq8UlV0YIBKMryp'
const JARVIS_VOICE_ID = process.env.ELEVEN_VOICE_ID_JARVIS || '2ZqnRUaCU5IaXJ45uakV'
// Зеркало ELEVEN_VOICE["aizere"] в agent.py: свой клон «zere».
const AIZERE_VOICE_ID = process.env.ELEVEN_VOICE_ID_AIZERE || 'o8Njj7tTSGK0GTiDKKes'
const ELEVEN_VOICE = {
  dexter: DEXTER_VOICE_ID,
  'dexter-harsh': DEXTER_VOICE_ID,
  jarvis: JARVIS_VOICE_ID,
  'jarvis-harsh': JARVIS_VOICE_ID,
  aizere: AIZERE_VOICE_ID,
}
const ELEVEN_MODEL = {
  dexter: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
  'dexter-harsh': process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
  jarvis: process.env.ELEVENLABS_MODEL_JARVIS || 'eleven_v3',
  'jarvis-harsh': process.env.ELEVENLABS_MODEL_JARVIS || 'eleven_v3',
  // v4 Turbo — зеркало ELEVEN_MODEL["aizere"] в agent.py.
  aizere: process.env.ELEVENLABS_MODEL_AIZERE || 'eleven_v4_turbo',
}
const DEFAULT_ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5'
// Совпадает с PERSONA_VOICE_SETTINGS["bro"] в agent.py: низкая stability +
// высокий style — иначе сленг звучит как диктор новостей.
const DEXTER_ELEVEN_SETTINGS = {
  stability: 0.32,
  similarity_boost: 0.75,
  style: 0.6,
  use_speaker_boost: true,
  speed: 1.04,
}
const JARVIS_ELEVEN_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
  speed: 1,
}
const ELEVEN_SETTINGS = {
  dexter: DEXTER_ELEVEN_SETTINGS,
  'dexter-harsh': DEXTER_ELEVEN_SETTINGS,
  jarvis: JARVIS_ELEVEN_SETTINGS,
  'jarvis-harsh': JARVIS_ELEVEN_SETTINGS,
}

function elevenKey(tutor) {
  const base = String(tutor || '').replace(/-harsh$/, '')
  if (base === 'jarvis') {
    return process.env.ELEVENLABS_API_KEY_JARVIS || process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY
  }
  if (base === 'aizere') {
    return process.env.ELEVENLABS_API_KEY_AIZERE || process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY
  }
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY
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

// languageCode у тьюторов — en-us, как у агента (плагин google по умолчанию):
// превью обязано звучать как живой звонок. Помощник по сайту (Луна) тоже
// идёт с en-US: с ru-RU Gemini звучал другим диктором (14.10.2026), поэтому
// цифры русской фразы роут помощника пишет словами, а язык не меняет.
async function geminiTts(text, voice, languageCode = 'en-us') {
  const r = await geminiContent(text, voice, languageCode)
  if (!r.content) return r
  return { audio: wavFromPcm(r.content), contentType: 'audio/wav' }
}

// Ответ Cloud TTS LINEAR16 как есть (base64 → байты); без ключа — { status: 503 }.
async function geminiContent(text, voice, languageCode) {
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
      voice: { languageCode, name: voice, model_name: GEMINI_MODEL },
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
  return { content: Buffer.from(b64, 'base64') }
}

// Голые сэмплы из ответа LINEAR16: Cloud TTS кладёт перед ними свою шапку WAV
// (её geminiTts по старинке заворачивает ещё раз — 22 сэмпла щелчка, на слух
// не заметно). Потоковому пути (lib/geminiTtsStream.js) нужен чистый PCM:
// он кодирует его в MP3, и шапка стала бы шумом в начале фразы.
function pcmFromLinear16(buf) {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return buf
  let at = 12
  while (at + 8 <= buf.length) {
    const id = buf.toString('ascii', at, at + 4)
    const size = buf.readUInt32LE(at + 4)
    if (id === 'data') return buf.subarray(at + 8, Math.min(buf.length, at + 8 + size))
    at += 8 + size + (size % 2)
  }
  return buf.subarray(44)
}

// Запрос синтеза ElevenLabs: path '' — запись целиком, '/stream' — та же запись
// кусками по мере синтеза (тело одинаковое, иначе голос разъедется). null —
// нет ключа или голоса для этого тьютора.
function elevenRequest(text, tutor, path, signal) {
  const key = elevenKey(tutor)
  const voiceId = ELEVEN_VOICE[tutor]
  if (!key || !voiceId) return null
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}${path}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': key },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL[tutor] || DEFAULT_ELEVEN_MODEL,
        voice_settings: ELEVEN_SETTINGS[tutor],
      }),
      signal,
    },
  )
}

async function elevenTts(text, tutor) {
  const request = elevenRequest(text, tutor, '')
  // Нет ключа или нет голоса для этого тьютора → 503, вызывающий уйдёт в откат.
  if (!request) return { status: 503 }
  const upstream = await request
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    throw new Error(`ElevenLabs TTS ${upstream.status}: ${detail.slice(0, 200)}`)
  }
  const audio = Buffer.from(await upstream.arrayBuffer())
  return { audio, contentType: 'audio/mpeg' }
}

async function sonioxTts(text, voice, lang, speed) {
  const key = process.env.SONIOX_API_KEY
  if (!key) return { status: 503 }
  const language = SONIOX_LANG[lang] || lang || 'en'
  const upstream = await fetch('https://tts-rt.soniox.com/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: SONIOX_MODEL, voice, language, text, speed, audio_format: 'mp3' }),
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

export function synth(provider, text, tutor, lang) {
  if (provider === 'soniox') {
    return sonioxTts(
      text,
      SONIOX_VOICE[tutor] || 'Owen',
      lang,
      SONIOX_SPEED[tutor] ?? DEFAULT_SONIOX_SPEED,
    )
  }
  if (provider === 'eleven') return elevenTts(text, tutor)
  if (provider === 'fish') return fishTts(text, FISH_VOICE[tutor] || FISH_VOICE.jarvis)
  if (provider === 'openai') return openaiTts(text, tutor, lang)
  return geminiTts(text, GEMINI_VOICE[tutor] || 'Puck')
}

/** Голос тьютора по его ключу; провайдер не настроен (503) — откат на Soniox, как у агента. */
export async function synthTutor(tutor, text, lang) {
  const provider = TUTOR_PROVIDER[tutor] || DEFAULT_PROVIDER
  let result = await synth(provider, text, tutor, lang)
  if (result.status === 503 && provider !== FALLBACK_PROVIDER) {
    result = await synth(FALLBACK_PROVIDER, text, tutor, lang)
  }
  return result
}

/** Какие провайдеры настроены на этом деплое (GET /api/tutor-tts). */
export function providerStatus() {
  return {
    gemini: Boolean(process.env.GOOGLE_CREDENTIALS_JSON),
    soniox: Boolean(process.env.SONIOX_API_KEY),
    eleven: Boolean(process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY),
    fish: Boolean(process.env.FISH_AUDIO_API_KEY),
    openai: Boolean(OPENAI_KEY()),
  }
}

/**
 * Голос Gemini напрямую, с языком фразы — для помощника по сайту (Луна,
 * «Aoede»). Без ключа Google — { status: 503 }, сбой провайдера — исключение.
 */
export function synthGemini(text, { voice = GEMINI_VOICE.luna, languageCode = 'en-us' } = {}) {
  return geminiTts(text, voice, languageCode)
}

/**
 * То же, что synthGemini, но голые сэмплы: { pcm } — 16 бит, 24 кГц, моно.
 * Запасной путь потокового синтеза помощника (lib/geminiTtsStream.js).
 */
export async function synthGeminiPcm(text, { voice = GEMINI_VOICE.luna, languageCode = 'en-us' } = {}) {
  const r = await geminiContent(text, voice, languageCode)
  return r.content ? { pcm: pcmFromLinear16(r.content) } : r
}

/** Модель и адрес Cloud TTS — общие для REST и потока, чтобы голос не разъехался. */
export const GEMINI_TTS = { model: GEMINI_MODEL, host: GEMINI_HOST }

/**
 * Токен сервисного аккаунта Google — тот же ключ и тот же кэш, что у REST.
 * Без ключа — null.
 * @returns {Promise<{ token: string, project: string | null } | null>}
 */
export async function googleAuth() {
  const creds = loadServiceAccount()
  if (!creds) return null
  return { token: await getAccessToken(creds), project: creds.project_id || null }
}

/**
 * Голос ElevenLabs потоком: onAudio(mp3) получает куски MP3 по мере синтеза
 * (/stream — первый звук ~0.8 с против 2–2.7 с у записи целиком, замер
 * 24.09/01.10.2026). Промис — конец записи или ошибка (AbortError по signal);
 * без ключа или голоса — ошибка с code 'no_credentials'.
 * @param {string} text
 * @param {string} tutor
 * @param {{ onAudio: (mp3: Buffer) => void, signal?: AbortSignal }} opts
 */
export async function streamEleven(text, tutor, { onAudio, signal } = {}) {
  const request = elevenRequest(text, tutor, '/stream', signal)
  if (!request) throw Object.assign(new Error(`ElevenLabs: no key or voice for ${tutor}`), { code: 'no_credentials' })
  const upstream = await request
  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    throw new Error(`ElevenLabs TTS stream ${upstream.status}: ${detail.slice(0, 200)}`)
  }
  const reader = upstream.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      if (value?.length) onAudio(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
}
