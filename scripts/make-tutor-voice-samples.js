// Генератор голосовых визиток для экрана выбора тьютора.
//
// Зачем файлы, а не живой TTS: превью на экране выбора — это одна и та же
// фраза, которую слышат все и много раз. Гонять её через провайдера на каждое
// нажатие значит платить за один и тот же звук снова и снова, ждать сеть и
// зависеть от квоты в момент, когда ученик только знакомится с приложением.
//
// Голоса берём у тех же провайдеров, что озвучивают тьютора вживую
// (зеркало TUTOR_PROVIDER из app/api/tutor-tts/route.js), иначе тембр на
// экране выбора разойдётся с тем, что ученик услышит в разговоре.
//
// Запуск (ключи читаются из .env.local в корне):
//   node scripts/make-tutor-voice-samples.js            # все, у кого есть ключи
//   node scripts/make-tutor-voice-samples.js luna       # только один
//
// Скрипт разовый по смыслу, но остаётся в репо: реплики правят, и перегенерация
// должна быть одной командой, а не археологией по curl-ам.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { TUTOR_GREETING, TUTOR_GREETING_LANG } from '../src/tutor/tutors.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'tutor', 'voice')

// Тексты живут в src/tutor/tutors.js и берутся оттуда, а не дублируются здесь:
// два списка одних и тех же реплик неизбежно разъезжаются, и тогда в репозитории
// лежит файл, озвучивающий не то, что написано в коде.
const SAMPLES = Object.fromEntries(
  Object.entries(TUTOR_GREETING).map(([key, text]) => [
    key,
    { text, lang: TUTOR_GREETING_LANG[key] || 'ru' },
  ]),
)

// ---- env ------------------------------------------------------------------
// Свой мини-парсер вместо dotenv: скрипт запускают руками, тащить зависимость
// ради трёх ключей незачем. BOM режем — значения из Windows-пайпа приезжают с
// ним, и ключ с невидимым префиксом потом ловится часами (см. CLAUDE.md).
function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(ROOT, name)
    if (!fs.existsSync(p)) continue
    const raw = fs.readFileSync(p, 'utf8').replace(/^﻿/, '')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  }
}

// ---- провайдеры ------------------------------------------------------------
// Все три просят MP3 на выходе: файл едет в репо и в браузер, а WAV с Cloud TTS
// весит вчетверо больше при том же звуке.

async function ttsGemini(text) {
  // Два способа отдать service account, как и у агента: переменная с самим
  // JSON (так задано в проде) или путь к файлу — стандартный
  // GOOGLE_APPLICATION_CREDENTIALS. Локально второй удобнее: скачанный из
  // консоли файл достаточно указать, не перекладывая ключ в .env.local.
  const raw =
    process.env.GOOGLE_CREDENTIALS_JSON ||
    (process.env.GOOGLE_APPLICATION_CREDENTIALS &&
      fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
  if (!raw) {
    throw new Error(
      'нужен GOOGLE_CREDENTIALS_JSON (сам JSON) или GOOGLE_APPLICATION_CREDENTIALS (путь к файлу)',
    )
  }
  const creds = JSON.parse(raw)
  const token = await googleAccessToken(creds)
  const host = process.env.GEMINI_TTS_HOST || 'https://texttospeech.googleapis.com'
  const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-tts'
  const res = await fetch(`${host}/v1beta1/text:synthesize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'ru-RU', name: 'Aoede', modelName: model },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  })
  if (!res.ok) throw new Error(`Cloud TTS ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const { audioContent } = await res.json()
  return Buffer.from(audioContent, 'base64')
}

// Service-account → access token. Подписываем JWT вручную: тянуть google-auth
// ради одного запроса не стоит, а crypto умеет RS256 из коробки.
async function googleAccessToken(creds) {
  const crypto = await import('node:crypto')
  const now = Math.floor(Date.now() / 1000)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const header = b64({ alg: 'RS256', typ: 'JWT' })
  const claim = b64({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: creds.token_uri,
    exp: now + 3600,
    iat: now,
  })
  const sig = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${claim}`)
    .sign(creds.private_key)
    .toString('base64url')
  const res = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${sig}`,
    }),
  })
  if (!res.ok) throw new Error(`token ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).access_token
}

async function ttsEleven(text) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_API_KEY не задан')
  // Тот же voice id и те же настройки, что у живого Декстера: низкая
  // stability + высокий style, иначе сленг звучит как диктор новостей.
  const voice = process.env.ELEVEN_VOICE_ID_DEXTER || 'rHWSYoq8UlV0YIBKMryp'
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.32,
          similarity_boost: 0.75,
          style: 0.6,
          use_speaker_boost: true,
          speed: 1.04,
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return Buffer.from(await res.arrayBuffer())
}

async function ttsSoniox(text, lang) {
  const key = process.env.SONIOX_API_KEY
  if (!key) throw new Error('SONIOX_API_KEY не задан')
  // Хост именно tts-rt (realtime), как в app/api/tutor-tts/route.js —
  // api.soniox.com отдаёт на этот путь 404.
  const res = await fetch('https://tts-rt.soniox.com/tts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.SONIOX_TTS_MODEL || 'tts-rt-v1',
      voice: 'Owen',
      language: lang,
      text,
      audio_format: 'mp3',
    }),
  })
  if (!res.ok) throw new Error(`Soniox ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return Buffer.from(await res.arrayBuffer())
}

const PROVIDER = { luna: ttsGemini, dexter: ttsEleven, spark: ttsSoniox }

// ---- main ------------------------------------------------------------------
async function main() {
  loadEnv()
  const only = process.argv.slice(2).filter((a) => a in SAMPLES)
  const keys = only.length ? only : Object.keys(SAMPLES)
  fs.mkdirSync(OUT_DIR, { recursive: true })

  let failed = 0
  for (const key of keys) {
    const { text, lang } = SAMPLES[key]
    try {
      const audio = await PROVIDER[key](text, lang)
      const out = path.join(OUT_DIR, `${key}.mp3`)
      fs.writeFileSync(out, audio)
      console.log(`✓ ${key}: ${(audio.length / 1024).toFixed(1)} КБ → public/tutor/voice/${key}.mp3`)
    } catch (e) {
      failed++
      console.error(`✗ ${key}: ${e.message}`)
    }
  }
  if (failed) {
    console.error(`\n${failed} из ${keys.length} не сгенерировано — файлы остались прежними.`)
    process.exitCode = 1
  }
}

main()
