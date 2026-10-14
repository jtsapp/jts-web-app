// Озвучка «Чисел» (Dexter's Number World): по записи на каждую фразу, которую
// игра может произнести, — ~960 фраз заданий и примеров объяснений.
//
// Ключ записи — сам текст, как его отдаёт игра (spokenOf / exSay из
// src/practice/numbers/logic.js), поэтому одно и то же слово в задании и в
// объяснении звучит одной записью. Имя файла — хэш того, что ушло в синтез
// (голос + темп + битрейт + текст): правка фразы в прототипе даёт новый файл, а
// готовые без --force не трогаются. Записи едут в репозиторий: платить за
// синтез на каждом открытии незачем, а запись звучит сразу, без сети до Soniox.
//
// Голос Freya — британский нейтральный: игра учит британским формам (nought,
// nil, half seven). Темп 1: замедляет и ускоряет сама игра на устройстве
// (playbackRate), иначе на каждый её темп понадобилась бы своя запись. 64 кбит/с
// моно — для речи хватает, а набор весит ~12 МБ вместо ~25 на дефолтных 128.
//
// По одному запросу за раз и с паузой: лимит Soniox — на ОРГАНИЗАЦИЮ, общую с
// голосом тьютора (см. make-lesson-audio.js).
//
// Запуск:
//   node scripts/make-numbers-audio.js              # всё, чего нет
//   node scripts/make-numbers-audio.js --dry        # план без запросов
//   node scripts/make-numbers-audio.js --limit 1    # пробная запись
//   node scripts/make-numbers-audio.js --force      # заново всё

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { sleep, loadEnv } = require('./make-lesson-audio.js')

const ROOT = path.join(__dirname, '..')
const BASE = path.join(ROOT, 'public', 'practice', 'numbers')
const OUT = path.join(BASE, 'audio')
const INDEX = path.join(OUT, 'index.json')

const VOICE = 'Freya'
const SPEED = 1
const BITRATE = 64000
const GAP_MS = 500
const RETRIES = 6

// Что синтез читает не так, как написано: цифры в связке со словами и знаки.
// Ключ — текст игры, значение — что отправить в синтез.
const OVERRIDES = {
  'on 5 May': 'on the fifth of May',
  'in 2026': 'in twenty twenty-six',
  'in the 1990s': 'in the nineteen nineties',
  'I was born in 2010.': 'I was born in twenty ten.',
  'midday / noon': 'midday, or noon',
  'two–nil': 'two nil',
  'fifteen–love': 'fifteen love',
  // Без паузы «thirds» смазывается: распознавание слышит «1.2» (сверено на пяти
  // синтезах); с запятой стабильно «1, and 2/3».
  'one and two thirds': 'one, and two thirds',
}

const fileOf = (input) => crypto.createHash('sha1').update(`${VOICE}|${SPEED}|${BITRATE}|${input}`).digest('hex').slice(0, 12)

/** Все фразы игры: задания (spokenOf) и примеры объяснений (exSay), без повторов. */
async function spokenTexts() {
  const { withGeneratedTours, spokenOf, exSay } = await import('../src/practice/numbers/logic.js')
  const data = JSON.parse(fs.readFileSync(path.join(BASE, 'data.json'), 'utf8'))
  const texts = new Set()
  const tours = withGeneratedTours(data.sections, data.tours)
  for (const groups of Object.values(tours)) for (const g of groups) for (const it of [...(g.own || []), ...g.items]) texts.add(spokenOf(it))
  for (const L of Object.values(data.lessons)) for (const r of L.rules) for (const e of r.ex || []) texts.add(exSay(e))
  return [...texts].filter(Boolean)
}

async function plan() {
  const texts = await spokenTexts()
  for (const k of Object.keys(OVERRIDES)) if (!texts.includes(k)) throw new Error(`override для фразы, которой в игре нет: ${k}`)
  return texts.map((text) => {
    const input = OVERRIDES[text] || text
    return { text, input, file: fileOf(input) }
  })
}

// Провайдер иногда отвечает 200 и телом-ошибкой — такой «mp3» в игру не кладём.
function looksLikeMp3(buf) {
  if (!buf || buf.length < 400) return false
  if (buf.toString('latin1', 0, 3) === 'ID3') return true
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
}

async function synthesize(text, attempt = 0) {
  const key = (process.env.SONIOX_API_KEY || '').replace(/^﻿/, '').trim()
  if (!key) throw new Error('SONIOX_API_KEY не задан (.env.local)')
  const again = async (why, ms) => {
    if (attempt >= RETRIES) throw new Error(`soniox: ${why} — не отпустило за ${RETRIES} попыток`)
    console.log(`  ${why} — ждём ${ms / 1000} с`)
    await sleep(ms)
    return synthesize(text, attempt + 1)
  }
  let res
  try {
    res = await fetch('https://tts-rt.soniox.com/tts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.SONIOX_TTS_MODEL || 'tts-rt-v2', voice: VOICE, language: 'en', text, speed: SPEED, audio_format: 'mp3', bitrate: BITRATE }),
    })
  } catch (e) {
    return again(`сеть (${e.message || e})`, 5000)
  }
  if (res.status === 429) return again('лимит провайдера', 30000)
  if (res.status >= 500) return again(`провайдер ${res.status}`, 10000)
  if (!res.ok) throw new Error(`soniox ${res.status}: ${(await res.text()).slice(0, 300)}`)
  let buf
  try {
    buf = Buffer.from(await res.arrayBuffer())
  } catch (e) {
    return again(`обрыв ответа (${e.message || e})`, 5000)
  }
  if (!looksLikeMp3(buf)) throw new Error(`не mp3 (${buf.length} байт): ${buf.toString('utf8', 0, 200)}`)
  return buf
}

/** Список записей для игры — только то, что лежит на диске. */
function writeIndex(items) {
  const index = {}
  for (const it of items) if (fs.existsSync(path.join(OUT, it.file + '.mp3'))) index[it.text] = it.file
  fs.writeFileSync(INDEX, JSON.stringify(index) + '\n')
  return Object.keys(index).length
}

async function run(argv = process.argv.slice(2)) {
  loadEnv()
  const dry = argv.includes('--dry')
  const force = argv.includes('--force')
  const li = argv.indexOf('--limit')
  const limit = li >= 0 ? Number(argv[li + 1]) : Infinity
  const items = await plan()
  fs.mkdirSync(OUT, { recursive: true })
  const todo = items.filter((it) => force || !fs.existsSync(path.join(OUT, it.file + '.mp3'))).slice(0, limit)
  console.log(`фраз ${items.length}, записать ${todo.length}, голос ${VOICE}`)
  if (dry) {
    for (const it of todo.slice(0, 50)) console.log(`  ${it.file}  ${it.input}`)
    return
  }
  let n = 0
  let bytes = 0
  for (const it of todo) {
    const mp3 = await synthesize(it.input)
    fs.writeFileSync(path.join(OUT, it.file + '.mp3'), mp3)
    n++
    bytes += mp3.length
    if (n % 25 === 0 || n === todo.length) {
      console.log(`  ${n}/${todo.length} — ${(bytes / 1048576).toFixed(1)} МБ`)
      writeIndex(items) // прогон можно прервать: список отражает то, что уже готово
    }
    await sleep(GAP_MS)
  }
  console.log(`в списке записей: ${writeIndex(items)} из ${items.length}`)
}

module.exports = { plan, spokenTexts, fileOf, OVERRIDES, looksLikeMp3 }

if (require.main === module) {
  run().catch((e) => {
    console.error(String(e.message || e))
    process.exit(1)
  })
}
