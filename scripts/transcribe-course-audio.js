#!/usr/bin/env node
// Тексты записей курса для «Текст записи» плеера (src/learning/courseTranscripts.js): распознаёт
// public/course/<level>/audio/*.mp3 и пишет public/course/<level>/transcripts.json, ключ — имя mp3.
// Имя — хэш содержимого, поэтому пересборка шагов связь не ломает. Запуск руками, не в CI: это платные
// запросы к Azure Speech (Fast Transcription, тот же вызов, что src/lib/ielts/azure-pronunciation.js).
//
//   AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=… node scripts/transcribe-course-audio.js --level b1 [--level a0] [--dry]
//
// Уже распознанные файлы пропускаются — можно перезапускать. После прогона выборочно прослушать 10–20
// записей и сверить с текстом: распознавание не знает, где «A:», а где «B:».
const fs = require('node:fs')
const path = require('node:path')

const API_VERSION = '2024-11-15'
const PAUSE_MS = 400

function levelsFromArgs(argv) {
  const out = []
  argv.forEach((a, i) => {
    if (a === '--level' && argv[i + 1]) out.push(String(argv[i + 1]).toLowerCase())
  })
  return out
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

function writeSorted(file, map) {
  const sorted = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]))
  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`)
}

async function transcribe(file, { key, region }) {
  const form = new FormData()
  form.append('audio', new Blob([fs.readFileSync(file)], { type: 'audio/mpeg' }), path.basename(file))
  form.append('definition', JSON.stringify({ locales: ['en-US'] }))
  const res = await fetch(
    `https://${region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=${API_VERSION}`,
    { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key }, body: form },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const phrases = Array.isArray(data?.combinedPhrases) ? data.combinedPhrases : []
  return phrases.map((p) => String(p.text || '').trim()).filter(Boolean).join(' ').trim()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const levels = levelsFromArgs(process.argv)
  const dry = process.argv.includes('--dry')
  if (!levels.length) {
    console.error('нужен хотя бы один --level <a0|a1|a2|b1|b2>')
    process.exit(1)
  }
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!dry && (!key || !region)) {
    console.error('нужны AZURE_SPEECH_KEY и AZURE_SPEECH_REGION (или --dry, чтобы посмотреть план)')
    process.exit(1)
  }
  for (const level of levels) {
    const dir = path.join(process.cwd(), 'public/course', level)
    const audioDir = path.join(dir, 'audio')
    const out = path.join(dir, 'transcripts.json')
    const done = readJson(out)
    const todo = fs.readdirSync(audioDir).filter((n) => n.endsWith('.mp3') && !done[n]).sort()
    console.log(`${level}: уже есть ${Object.keys(done).length}, распознать ${todo.length}`)
    if (dry) continue
    const failed = []
    for (const name of todo) {
      try {
        const text = await transcribe(path.join(audioDir, name), { key, region })
        if (text) {
          done[name] = text
          writeSorted(out, done)
        } else failed.push(`${name}: пустой текст`)
      } catch (e) {
        failed.push(`${name}: ${e.message}`)
      }
      await sleep(PAUSE_MS)
    }
    console.log(`${level}: готово ${Object.keys(done).length}; не распознано ${failed.length}`)
    failed.forEach((f) => console.log(`  ${f}`))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
