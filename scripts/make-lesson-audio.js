// Озвучка того, для чего в исходном курсе записи не было.
//
// Курс помечал такие места атрибутом `data-say` и читал их браузерным синтезом
// («Read aloud by your device»), а слова словаря вообще не озвучивал, хотя
// инструкция стадии обещает: «Look and listen. Tap a picture to hear the
// word». На экране всё это оставалось немым.
//
// Два вида материала — два провайдера:
//
//   words     слова словаря и слова заданий «Listen. Choose the word you hear»
//             → Soniox (SONIOX_API_KEY, им же говорит Спарк в тьюторе)
//             Слова берутся из того же источника, что и у сайта: есть
//             public/course/<level>/ — из него, иначе из
//             public/learning/<level>.json. Без этой развилки у B2 озвучился
//             бы старый Speakout из public/learning/b2.json, который на экране
//             давно не показывается.
//   narration связные куски материала на 30–50 слов
//             → Google Cloud TTS, gemini-2.5-flash-tts — голос Луны
//
// Разделение вынужденное: в проекте service account'а Cloud TTS выключен, и
// упереться в это, генерируя словарь, было бы обидно. Провайдер выбирается по
// виду материала, недоступность одного не мешает другому.
//
// Файлы кладутся в public/learning/audio/<level>/ и едут в репозиторий: платить
// за синтез одного и того же слова на каждое открытие урока незачем. Имя файла
// — хэш самого текста (scripts/jts-self/say-audio.js), поэтому одно слово
// звучит одинаково и на карточке словаря, и в задании на слух, а прогон
// экстрактора заново находит уже сгенерированное.
//
// Запуск (ключи из .env.local в корне репозитория; в worktree его надо
// положить рядом — свой .env.local у каждого дерева):
//   node scripts/make-lesson-audio.js                        # всё, чего нет
//   node scripts/make-lesson-audio.js --level a0 --only words
//   node scripts/make-lesson-audio.js --dry                  # показать план
//   node scripts/make-lesson-audio.js --force                # перегенерить
//
// Для narration нужен GOOGLE_CREDENTIALS_JSON (сам JSON) или
// GOOGLE_APPLICATION_CREDENTIALS (путь к файлу service account).
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { sayAudioFile } = require('./jts-self/say-audio')
const { strip } = require('./build-course-steps.js')

const ROOT = path.join(__dirname, '..')
const LEARNING = path.join(ROOT, 'public/learning')
const AUDIO_DIR = path.join(LEARNING, 'audio')
const COURSE = path.join(ROOT, 'public/course')
// Уровни, где карточки словаря сейчас немые. A2/B1 гоняются тем же
// `--level a2`, просто до них пока не доходили руки.
const LEVELS = ['a0', 'a1', 'b2']

// Диктор материала урока — не тьютор: он не знакомится и не поддерживает, он
// читает текст. Поэтому просим ровное чтение без игры голосом. Отдельно
// запрещаем спешку: на A0–A1 студент разбирает речь по словам, и «обычный»
// темп носителя для него слишком быстрый.
const PROMPT =
  'Read this aloud as clear, neutral narration for a beginner English learner. ' +
  'Calm, even pace — slightly slower than ordinary conversation, but not dragging. ' +
  'Crisp articulation, natural sentence intonation. No theatrical delivery, no ' +
  'sing-song rhythm, no breathiness, no dramatic pauses.'

// Слова словаря озвучивает Soniox, а не Gemini. Причина прозаична: в проекте
// service account'а Cloud TTS выключен, а ключ Soniox уже лежит в .env.local и
// им же говорит Спарк в тьюторе. Голос один на все слова (Owen) — это диктор
// словаря, а не персонаж, и менять его от слова к слову незачем.
//
// Темп ниже разговорного: слово в словаре слушают, чтобы повторить, и на A0
// «обычная» скорость носителя для этого быстра. Диапазон провайдера
// [0.7–1.3], берём заметно медленнее середины — как у голосовой визитки Спарка.
const SONIOX_VOICE = process.env.LESSON_TTS_SONIOX_VOICE || 'Owen'
const SONIOX_SPEED = 0.85

// Словарь — это четыре сотни запросов подряд, и на такой дистанции ломается
// всё: у Soniox лимит запросов в минуту на организацию (упёрлись на сотом
// слове), а сеть роняет соединение просто так (`fetch failed` на 139-м).
// Пауза держит под лимитом, повтор с отступом вытаскивает из обоих случаев.
// Отдельный обработчик нужен именно для сетевой осечки: она приходит
// исключением, а не кодом ответа, и раньше убивала весь прогон.
const SONIOX_GAP_MS = Number(process.env.LESSON_TTS_GAP_MS || 700)
const SONIOX_RETRIES = 6
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function synthesizeSoniox(text, attempt = 0) {
  const key = process.env.SONIOX_API_KEY
  if (!key) throw new Error('SONIOX_API_KEY не задан')

  const again = async (why, waitMs) => {
    if (attempt >= SONIOX_RETRIES) throw new Error(`soniox: ${why} — не отпустило за ${SONIOX_RETRIES} попыток`)
    console.log(`  ${why} — ждём ${waitMs / 1000} с (попытка ${attempt + 1})`)
    await sleep(waitMs)
    return synthesizeSoniox(text, attempt + 1)
  }

  let res
  try {
    // Хост именно tts-rt (realtime), как в app/api/tutor-tts/route.js —
    // api.soniox.com отдаёт на этот путь 404.
    res = await fetch('https://tts-rt.soniox.com/tts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.SONIOX_TTS_MODEL || 'tts-rt-v1',
        voice: SONIOX_VOICE,
        language: 'en',
        text,
        speed: SONIOX_SPEED,
        audio_format: 'mp3',
      }),
    })
  } catch (e) {
    // Сеть моргнула — ждём немного и пробуем снова.
    return again(`сеть (${e.message || e})`, 5000)
  }

  if (res.status === 429) return again('лимит провайдера', 30000)
  // 5xx у провайдера тоже лечится ожиданием — в отличие от 4xx, где виноват
  // запрос и повтор ничего не изменит.
  if (res.status >= 500) return again(`провайдер ${res.status}`, 10000)
  if (!res.ok) throw new Error(`soniox ${res.status}: ${(await res.text()).slice(0, 300)}`)

  try {
    return Buffer.from(await res.arrayBuffer())
  } catch (e) {
    // Соединение оборвалось на теле ответа — файл был бы битым.
    return again(`обрыв ответа (${e.message || e})`, 5000)
  }
}

/**
 * Слова уровня, которым нужна запись: слова карточек словаря и слова заданий
 * «Listen. Choose the word you hear.» (поле say у choice).
 *
 * Один файл на слово, ключ — сам текст. Поэтому слово, которое студент слышит
 * на карточке, и оно же в задании на слух звучат ОДИНАКОВО: иначе задание
 * проверяло бы не память, а способность узнать другой голос.
 */
function wordsOf(level) {
  return isCourseLevel(level) ? courseWordsOf(level) : nativeWordsOf(level)
}

// Уровень переведён на перенесённый курс: словарь лежит не в
// public/learning/<level>.json, а строками VOCAB внутри каждого урока.
const isCourseLevel = (level) => fs.existsSync(path.join(COURSE, level, 'index.json'))

// Слова курса. Первое поле строки VOCAB — само слово; сущности раскрываем тем
// же strip, что и сборщик шагов, иначе Soniox прочитает «don&rsquo;t», а хэш
// файла не совпадёт с тем, что ищет плеер.
function courseWordsOf(level) {
  const dir = path.join(COURSE, level)
  const { lessons = [] } = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))
  const seen = new Map()
  for (const l of lessons) {
    const file = path.join(dir, `lesson-${l.n}.json`)
    if (!fs.existsSync(file)) continue
    const lesson = JSON.parse(fs.readFileSync(file, 'utf8'))
    const v = lesson.VOCAB
    const rows = Array.isArray(v) ? v : (v && (v.self || v.group || v.solo)) || []
    for (const row of rows) {
      const word = strip(Array.isArray(row) ? row[0] : row)
      if (!word) continue
      const key = sayAudioFile(word)
      if (!seen.has(key)) seen.set(key, { file: key, text: word, code: `L${l.n}`, title: l.title, provider: 'soniox' })
    }
  }
  return [...seen.values()]
}

function nativeWordsOf(level) {
  const file = path.join(LEARNING, `${level}.json`)
  if (!fs.existsSync(file)) return []
  const { lessons } = JSON.parse(fs.readFileSync(file, 'utf8'))
  const seen = new Map()
  const add = (text, code, title) => {
    const word = String(text || '').trim()
    if (!word) return
    const key = sayAudioFile(word)
    if (!seen.has(key)) seen.set(key, { file: key, text: word, code, title, provider: 'soniox' })
  }
  for (const [code, lesson] of Object.entries(lessons)) {
    for (const task of lesson.tasks || []) {
      if (task.type === 'cards') for (const w of task.words || []) add(w.en, code, lesson.title)
      if (task.type === 'choice' && task.say) add(task.say, code, lesson.title)
    }
  }
  return [...seen.values()]
}

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
  // У курс-уровней связного материала для озвучки нет: записи стадий приехали
  // вместе с курсом. А файл public/learning/<level>.json у них хоть и лежит,
  // но это старый Speakout, который сайт уже не показывает.
  if (isCourseLevel(level)) return []
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
  const kindAt = argv.indexOf('--only')
  return {
    levels: at >= 0 && argv[at + 1] ? [argv[at + 1]] : LEVELS,
    // words — слова словаря и слова заданий на слух (Soniox);
    // narration — связные куски материала (Gemini). Разные провайдеры, и
    // недоступность одного не должна мешать сгенерировать другое.
    only: kindAt >= 0 && argv[kindAt + 1] ? argv[kindAt + 1] : 'all',
    dry: argv.includes('--dry'),
    force: argv.includes('--force'),
    // --limit N — сначала записать несколько штук и послушать, а потом уже
    // запускать словарь целиком: прогон на семь сотен слов идёт минут двадцать.
    limit: argv.indexOf('--limit') >= 0 ? Number(argv[argv.indexOf('--limit') + 1]) : 0,
  }
}

async function run() {
  loadEnv()
  const { levels, only, dry, force, limit } = parseArgs()

  const plan = []
  for (const level of levels) {
    const items = [
      ...(only === 'narration' ? [] : wordsOf(level)),
      ...(only === 'words' ? [] : narrationsOf(level)),
    ]
    for (const item of items) {
      const out = path.join(AUDIO_DIR, level, item.file)
      if (!force && fs.existsSync(out)) continue
      plan.push({ ...item, level, out })
    }
  }

  const planned = plan.length
  if (limit > 0) plan.length = Math.min(plan.length, limit)

  if (!plan.length) {
    console.log('нечего генерировать: записи всех текстов уже на месте')
    return
  }
  const words = plan.filter((i) => i.provider === 'soniox').length
  console.log(`нужно записей: ${plan.length}${planned > plan.length ? ` из ${planned} (--limit)` : ''} (слов ${words}, связного материала ${plan.length - words})`)
  if (dry) {
    for (const item of plan) {
      const who = item.provider === 'soniox' ? SONIOX_VOICE : item.voice
      console.log(`  ${item.level}/${item.file}  ${who}  ${item.code} · ${item.title}`)
      console.log(`    «${item.text.slice(0, 90)}${item.text.length > 90 ? '…' : ''}»`)
    }
    return
  }

  // Токен Google берём только если он реально нужен: слова идут через Soniox,
  // и упасть на отсутствующем service account, генерируя словарь, было бы
  // глупо.
  let token = null
  let done = 0
  let bytes = 0
  for (const item of plan) {
    let mp3
    if (item.provider === 'soniox') {
      mp3 = await synthesizeSoniox(item.text)
      await sleep(SONIOX_GAP_MS)
    } else {
      if (!token) token = await googleAccessToken(credentials())
      mp3 = await synthesize(token, item.text, item.voice)
    }
    fs.mkdirSync(path.dirname(item.out), { recursive: true })
    fs.writeFileSync(item.out, mp3)
    done++
    bytes += mp3.length
    if (done % 25 === 0 || done === plan.length) {
      console.log(`  ${done}/${plan.length} — ${(bytes / 1048576).toFixed(1)} МБ`)
    }
  }
  console.log(`готово: ${done} записей, ${(bytes / 1048576).toFixed(1)} МБ.`)
  console.log('Дальше: нативные уровни — экстрактор, курс-уровни — build-course-steps.js. Оба привязывают записи к заданиям по хэшу слова.')
}

if (require.main === module) {
  run().catch((e) => {
    console.error(String(e.message || e))
    process.exit(1)
  })
}

module.exports = { narrationsOf }
