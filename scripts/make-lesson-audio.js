// Озвучка заданий «Обучения», у которых в исходном курсе записи не было.
//
// Такие задания курс помечал `data-say` и читал браузерным синтезом («Read
// aloud by your device»), а на экране у нас оставался немой текст. Голос берём
// тот же, что у Луны в тьюторе — Google Cloud TTS, модель gemini-2.5-flash-tts
// (зеркало ttsGemini из scripts/make-tutor-voice-samples.js), чтобы звук в
// уроке и в разговоре с тьютором был из одного семейства.
//
// Файлы кладутся в public/learning/audio/<level>/ и едут в репозиторий: это
// семь коротких дорожек на весь курс, а не пользовательский контент, и платить
// за синтез одного и того же текста на каждое открытие урока незачем. Имя
// файла — хэш текста (scripts/jts-self/say-audio.js), поэтому прогон
// экстрактора заново находит уже сгенерированное и не требует перезаписи.
//
// Запуск (ключи из .env.local в корне):
//   node scripts/make-lesson-audio.js              # все уровни, чего нет
//   node scripts/make-lesson-audio.js --level a1   # один уровень
//   node scripts/make-lesson-audio.js --dry        # только показать, что нужно
//   node scripts/make-lesson-audio.js --force      # перегенерить существующее
//
// Нужен доступ к Cloud Text-to-Speech: GOOGLE_CREDENTIALS_JSON (сам JSON) или
// GOOGLE_APPLICATION_CREDENTIALS (путь к файлу service account).
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { sayAudioFile } = require('./jts-self/say-audio')

const ROOT = path.join(__dirname, '..')
const LEARNING = path.join(ROOT, 'public/learning')
const AUDIO_DIR = path.join(LEARNING, 'audio')
const LEVELS = ['a0', 'a1']

// Диктор материала урока — не тьютор: он не знакомится и не поддерживает, он
// читает текст. Поэтому просим ровное чтение без игры голосом. Отдельно
// запрещаем спешку: на A0–A1 студент разбирает речь по словам, и «обычный»
// темп носителя для него слишком быстрый.
const PROMPT =
  'Read this aloud as clear, neutral narration for a beginner English learner. ' +
  'Calm, even pace — slightly slower than ordinary conversation, but not dragging. ' +
  'Crisp articulation, natural sentence intonation. No theatrical delivery, no ' +
  'sing-song rhythm, no breathiness, no dramatic pauses.'

// Голоса. Внутри одного урока дикторы чередуются: в L01-7 о себе рассказывают
// три РАЗНЫХ человека («Amina's story», «Daniyar's story», «Lena's story»), и
// одним голосом задание «кто из них работал в кафе» не решается — различать
// говорящих просто не по чему. Aoede стоит первой: это голос Луны в тьюторе,
// и с него начинается любой урок с одной дорожкой.
const VOICES = ['Aoede', 'Puck', 'Kore']

// ---- env ------------------------------------------------------------------
// Свой мини-парсер вместо dotenv (как в make-tutor-voice-samples.js): скрипт
// запускают руками. BOM режем — значения из Windows-пайпа приезжают с ним, и
// ключ с невидимым префиксом потом ловится часами (см. CLAUDE.md).
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

async function googleAccessToken(creds) {
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
  const sig = crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(creds.private_key).toString('base64url')
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

function credentials() {
  const raw =
    process.env.GOOGLE_CREDENTIALS_JSON ||
    (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
  if (!raw) {
    throw new Error('нужен GOOGLE_CREDENTIALS_JSON (сам JSON) или GOOGLE_APPLICATION_CREDENTIALS (путь к файлу)')
  }
  return JSON.parse(raw)
}

async function synthesize(token, text, voice) {
  const host = process.env.GEMINI_TTS_HOST || 'https://texttospeech.googleapis.com'
  const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-tts'
  const res = await fetch(`${host}/v1beta1/text:synthesize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // prompt — единственный рычаг стиля и темпа у gemini-tts: он идёт рядом
      // с text внутри input, а не в audioConfig.
      input: { text, prompt: PROMPT },
      voice: { languageCode: 'en-US', name: process.env.LESSON_TTS_VOICE || voice, modelName: model },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  })
  if (!res.ok) throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  if (!data.audioContent) throw new Error('ответ без audioContent')
  return Buffer.from(data.audioContent, 'base64')
}

/** Тексты уровня, которым нужна запись: у задания есть say и нет своей дорожки. */
function narrationsOf(level) {
  const file = path.join(LEARNING, `${level}.json`)
  if (!fs.existsSync(file)) return []
  const { lessons } = JSON.parse(fs.readFileSync(file, 'utf8'))
  const seen = new Map()
  const perLesson = new Map()
  for (const [code, lesson] of Object.entries(lessons)) {
    for (const task of lesson.tasks || []) {
      // Одиночные слова на слух (say у choice) озвучивает сам плеер синтезом
      // браузера: их 250, они в одно слово, и держать под них файлы в репо
      // незачем. Здесь — только связные куски материала.
      if (task.type !== 'info' || !task.say) continue
      const key = sayAudioFile(task.say)
      // Голос — по порядку внутри урока: соседние дорожки одного урока это
      // разные говорящие, а один и тот же текст в двух уроках должен звучать
      // одинаково (файл всё равно один).
      if (!seen.has(key)) seen.set(key, { file: key, text: task.say, code, title: lesson.title, voice: VOICES[(perLesson.get(code) || 0) % VOICES.length] })
      perLesson.set(code, (perLesson.get(code) || 0) + 1)
    }
  }
  return [...seen.values()]
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const at = argv.indexOf('--level')
  return {
    levels: at >= 0 && argv[at + 1] ? [argv[at + 1]] : LEVELS,
    dry: argv.includes('--dry'),
    force: argv.includes('--force'),
  }
}

async function run() {
  loadEnv()
  const { levels, dry, force } = parseArgs()

  const plan = []
  for (const level of levels) {
    for (const item of narrationsOf(level)) {
      const out = path.join(AUDIO_DIR, level, item.file)
      if (!force && fs.existsSync(out)) continue
      plan.push({ ...item, level, out })
    }
  }

  if (!plan.length) {
    console.log('нечего генерировать: записи всех текстов уже на месте')
    return
  }
  console.log(`нужно записей: ${plan.length}`)
  for (const item of plan) {
    console.log(`  ${item.level}/${item.file}  ${item.voice}  ${item.code} · ${item.title}`)
    console.log(`    «${item.text.slice(0, 90)}${item.text.length > 90 ? '…' : ''}»`)
  }
  if (dry) return

  const token = await googleAccessToken(credentials())
  for (const item of plan) {
    const mp3 = await synthesize(token, item.text, item.voice)
    fs.mkdirSync(path.dirname(item.out), { recursive: true })
    fs.writeFileSync(item.out, mp3)
    console.log(`✓ ${item.level}/${item.file} — ${item.voice}, ${(mp3.length / 1024) | 0} KB`)
  }
  console.log('готово. Дальше прогоняй экстрактор — он привяжет записи к заданиям.')
}

if (require.main === module) {
  run().catch((e) => {
    console.error(String(e.message || e))
    process.exit(1)
  })
}

module.exports = { narrationsOf }
