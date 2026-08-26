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

import { normalizeForSpeech, openaiInstructions, openaiSpeed } from '../src/tutor/openaiTtsStyle.js'
import { TUTOR_GREETING, TUTOR_GREETING_LANG } from '../src/tutor/tutors.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// SAMPLE_OUT_DIR — чтобы подбирать интонацию, не перезаписывая то, что уже
// лежит в репозитории: генеришь варианты во временную папку, слушаешь, и
// только победитель едет в public.
const OUT_DIR = process.env.SAMPLE_OUT_DIR || path.join(ROOT, 'public', 'tutor', 'voice')

// Настройки «живости». Держим в одном месте: подбираются они на слух, и
// искать их потом по трём разным функциям — гарантированный способ получить
// три разных темпа речи.
//
// Общая проблема первой версии: все трое тараторили. Диктор, который спешит,
// звучит как автоответчик, а не как собеседник, — а это первое, что слышит
// человек о своём будущем тьюторе.
const TUNING = {
  // Луна (Cloud TTS). Темпом здесь не порулить ручкой: у gemini-tts моделей
  // audioConfig.speakingRate не действует, стиль и скорость задаются СЛОВАМИ
  // в input.prompt.
  //
  // Промпт написан от противного, и это не случайность. Попытка попросить
  // «тепло, мягко, неспешно, с паузами» дала заторможенную речь с придыханием
  // и тянущимися гласными — тестер описал её как «будто она под кайфом».
  // Виноваты оказались не темп, а именно придыхание и распевность, поэтому
  // теперь мы их прямо запрещаем, а взамен просим обычную бытовую речь.
  // Просьба «живее и выразительнее» тоже мимо: модель читает это как
  // театральность и растягивает фразу в полтора раза.
  luna: {
    prompt:
      'Speak Russian plainly and naturally, the way a friendly person introduces ' +
      'herself in everyday conversation. Ordinary speaking pace, ordinary energy, ' +
      'crisp articulation. No dramatic pauses, no theatrical or sing-song ' +
      'intonation, no breathiness, no drawn-out vowels. ' +
      '"Луна" is stressed on the SECOND syllable — lu-NA, exactly like the ' +
      'Russian word for the moon. Never say LU-na.',
  },
  // Декстер (ElevenLabs). speed 1.04 звучал как скороговорка; 0.9 — нижняя
  // треть допустимого [0.8–1.2], разболтанный тон персонажа от этого только
  // выигрывает. stability пониже, style повыше — больше интонационной игры.
  dexter: { speed: 0.9, stability: 0.28, style: 0.7 },
  // Спарк (Soniox). Кроме темпа крутить нечего — эмоций провайдер не умеет.
  // Диапазон [0.7–1.3], берём заметно медленнее середины.
  spark: { speed: 0.85 },
  // Джарвис (ВРЕМЕННО OpenAI TTS вместо клона Fish Audio). У gpt-4o-mini-tts
  // ручек стиля нет вовсе: голос — пресет из каталога, характер задаётся только
  // текстом instructions (см. src/tutor/openaiTtsStyle.js, общий с живым
  // превью), как prompt у Луны. latency остался для пути Fish — визитка
  // озвучивается офлайн, спешить некуда.
  jarvis: { latency: 'balanced' },
}

// Тексты живут в src/tutor/tutors.js и берутся оттуда, а не дублируются здесь:
// два списка одних и тех же реплик неизбежно разъезжаются, и тогда в репозитории
// лежит файл, озвучивающий не то, что написано в коде.
// Как произносить то, что написано. Синтез читает «Луна» как нарицательное —
// «лунá», спутник Земли, — но это ИМЯ, и звучать оно должно «Лу́на», с ударением
// на первый слог. Знак ударения U+0301 после нужной гласной ставит его на место.
// Правка живёт здесь, а не в TUTOR_GREETING: там текст должен оставаться чистым,
// иначе подпись на экране обзаведётся невидимыми символами, которые потом ловить
// поиском по коду.
// SAMPLE_NO_STRESS=1 отключает — им сравнивают варианты при подборе интонации.
const PRONUNCIATION = {
  luna: (t) => t.replace(/Луна/g, 'Луна́'),
}

const SAMPLES = Object.fromEntries(
  Object.entries(TUTOR_GREETING).map(([key, text]) => [
    key,
    {
      text: process.env.SAMPLE_NO_STRESS ? text : (PRONUNCIATION[key]?.(text) ?? text),
      lang: TUTOR_GREETING_LANG[key] || 'ru',
    },
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
      // Имя допускаем в любом регистре: ключ Fish Audio приехал в .env.local
      // как Fish_Audio_API, и строгий [A-Z0-9_] молча его не видел — скрипт
      // ругался «ключ не задан», хотя ключ лежал строкой выше.
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
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
      // prompt — единственный рычаг стиля и темпа у gemini-tts: он идёт
      // рядом с text внутри input, а не в audioConfig (см. TUNING).
      input: { text, prompt: TUNING.luna.prompt },
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
          stability: TUNING.dexter.stability,
          similarity_boost: 0.75,
          style: TUNING.dexter.style,
          use_speaker_boost: true,
          speed: TUNING.dexter.speed,
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
      speed: TUNING.spark.speed,
      audio_format: 'mp3',
    }),
  })
  if (!res.ok) throw new Error(`Soniox ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return Buffer.from(await res.arrayBuffer())
}

async function ttsFish(text) {
  const key = process.env.FISH_AUDIO_API_KEY
  if (!key) throw new Error('FISH_AUDIO_API_KEY не задан')
  // Тот же reference_id, что у живого Джарвиса (FISH_VOICE в
  // app/api/tutor-tts/route.js и FISH_TTS_VOICE в agent.py).
  const voice = process.env.FISH_VOICE_ID_JARVIS || 'c47719f52ce34cc193b9bc2f00565e8a'
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      // Модель у Fish едет заголовком, а не полем тела.
      // Та же модель, что у живого Джарвиса (см. FISH_MODEL в tutor-tts/route.js).
      model: process.env.FISH_TTS_MODEL || 's2.1-pro',
    },
    body: JSON.stringify({
      text,
      reference_id: voice,
      format: 'mp3',
      mp3_bitrate: 128,
      latency: TUNING.jarvis.latency,
    }),
  })
  if (!res.ok) throw new Error(`Fish Audio ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return Buffer.from(await res.arrayBuffer())
}

// OpenAI TTS — сейчас на нём Джарвис в обоих нравах (зеркало openaiTts в
// app/api/tutor-tts/route.js и _cascade_tts_openai в agent.py). Имя ключа
// читаем в двух написаниях: в .env.local он приехал как OpenAI_API_KEY.
//
// Голос берётся по БАЗОВОМУ ключу, подача — по ключу с нравом: 18+ меняет
// интонацию и темп, а тембр остаётся тот же.
async function ttsOpenai(text, lang, key) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OpenAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY не задан')
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // gpt-4o-mini-tts, а не tts-1: только он принимает instructions.
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: process.env.OPENAI_TTS_VOICE_JARVIS || 'ash',
      input: normalizeForSpeech(text, lang),
      instructions: openaiInstructions(key, lang),
      speed: openaiSpeed(key),
      response_format: 'mp3',
    }),
  })
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return Buffer.from(await res.arrayBuffer())
}

// Ключи с суффиксом -harsh — визитки жёсткого нрава (кнопка 18+ на карточке).
// Провайдер и тембр у них те же: нрав меняет характер, а не голос.
const PROVIDER = {
  luna: ttsGemini,
  dexter: ttsEleven,
  spark: ttsSoniox,
  // TTS_PROVIDER_JARVIS=fish — то же имя переменной, что у агента
  // (_tts_provider_for): вернуть клон Fish можно без правки кода, и путь
  // ttsFish остаётся живым, а не мёртвой функцией под удаление.
  jarvis: process.env.TTS_PROVIDER_JARVIS === 'fish' ? ttsFish : ttsOpenai,
  'dexter-harsh': ttsEleven,
  'spark-harsh': ttsSoniox,
  'jarvis-harsh': ttsOpenai,
}

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
      // key третьим аргументом: у OpenAI подача читается по ключу С НРАВОМ
      // (jarvis-harsh), а остальным провайдерам он просто не нужен.
      const audio = await PROVIDER[key](text, lang, key)
      const out = path.join(OUT_DIR, `${key}.mp3`)
      fs.writeFileSync(out, audio)
      console.log(`✓ ${key}: ${(audio.length / 1024).toFixed(1)} КБ → ${path.relative(ROOT, out) || out}`)
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
