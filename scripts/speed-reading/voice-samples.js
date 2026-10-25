// Образцы голосов Скорочтения — чтобы владелец выбрал на слух британский женский и мужской голос (этап 6.3
// плана). Синтез — тот же модуль, что у роута образца (src/lib/speedReading/sample.js), поэтому слышно ровно то,
// что услышит ученик. Тексты — «Прогноз погоды» (Astana, Almaty) и «Экскурсовод» (Charyn Canyon): на них и
// проверяются ударения в казахстанских названиях.
//
// Запуск (ключ — ELEVENLABS_API_KEY из .env.local):
//   node scripts/speed-reading/voice-samples.js --list                 # британские голоса кабинета
//   node scripts/speed-reading/voice-samples.js --voices id1,id2,…     # mp3 в build/speed-reading/voices/
//   [--texts weather,tour] [--model eleven_multilingual_v2]

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { DEFAULT_MODEL, sampleWpm, wordsFromAlignment } from '../../src/lib/speedReading/sample.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(ROOT, 'build', 'speed-reading', 'voices')
const require = createRequire(import.meta.url)

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(ROOT, name)
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function api(p, init = {}) {
  const res = await fetch(`https://api.elevenlabs.io${p}`, { ...init, headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, ...(init.headers || {}) } })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function main() {
  loadEnv()
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('нет ELEVENLABS_API_KEY')
  const { voices } = await api('/v1/voices')
  const british = voices.filter((v) => /british/i.test(v.labels?.accent || ''))
  if (process.argv.includes('--list')) {
    for (const v of british) console.log(`${v.voice_id}  ${v.name}  (${v.labels?.gender})`)
    return
  }
  const ids = arg('--voices', british.map((v) => v.voice_id).join(',')).split(',').filter(Boolean)
  const model = arg('--model', DEFAULT_MODEL)
  const { readTexts } = require('./export-texts.js')
  const all = readTexts(fs.readFileSync(path.join(ROOT, 'data', 'jts-student-cabinet.html'), 'utf8'))
  const texts = arg('--texts', 'weather,tour').split(',').map((id) => all.find((t) => t.id === id)).filter(Boolean)
  fs.mkdirSync(OUT, { recursive: true })
  const index = []
  for (const id of ids) {
    const v = voices.find((x) => x.voice_id === id)
    const name = (v?.name || id).split(/\s*-\s*/)[0].toLowerCase()
    for (const t of texts) {
      // Свой запрос, а не synthSample: тому нужен ключ голоса образца (uk-female | uk-male), а здесь — любой id.
      const data = await api(`/v1/text-to-speech/${id}/with-timestamps?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: t.x, model_id: model }),
      })
      const words = wordsFromAlignment(t.x, data.alignment)
      const file = `${name}-${t.id}.mp3`
      fs.writeFileSync(path.join(OUT, file), Buffer.from(data.audio_base64, 'base64'))
      index.push({ file, voice: id, name: v?.name || id, gender: v?.labels?.gender || '', text: t.id, title: t.t.ru, wpm: sampleWpm(words), seconds: words.at(-1)?.[2] ?? 0 })
      console.log(`${file}  ${sampleWpm(words)} сл/мин`)
    }
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ model, items: index }, null, 2) + '\n')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
