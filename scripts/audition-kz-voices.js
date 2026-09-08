// Прослушка голосов Soniox на КАЗАХСКОЙ фразе.
//
// Зачем отдельный скрипт. Голос тьютора выбирается на слух, и это уже делали
// один раз: Daniel в SONIOX_TTS_VOICE стоит с пометкой «выбран на слух из
// перебора мужских голосов на казахской фразе». Перебор тогда делали руками, а
// результат остался только в комментарии — повторить его было нечем. Отсюда
// этот файл: одна фраза, все голоса, один прогон.
//
// Почему это важнее подбора промпта. Soniox читает текст ЛЮБЫМ голосом (голос
// language-agnostic, параметр language лишь смещает фонетику), поэтому «тьютор
// не говорит по-казахски» может означать не плохой текст, а голос, который
// казахскую фонетику не тянет. Сравнение на ОДНОЙ фразе разводит эти две
// причины: если все голоса звучат одинаково плохо — дело в тексте/языке, если
// один внятный, а другой нет — дело в голосе.
//
// Запуск (ключ читается из .env.local в корне):
//   node scripts/audition-kz-voices.js
//   node scripts/audition-kz-voices.js --voices Owen,Daniel --text "Сәлем!"
//   node scripts/audition-kz-voices.js --lang ru     # тот же текст с русской
//                                                    # фонетикой — слышно разницу
// Файлы: build/kz-audition/<voice>__<lang>.mp3 (build/ в gitignore).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// .env.local читаем сами: скрипт разовый, тащить сюда next/dotenv незачем.
for (const file of ['.env.local', '.env']) {
  const p = path.join(ROOT, file)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt
}

// Голоса из SONIOX_TTS_VOICE (agent.py) + пара соседних из каталога. Owen —
// голос живого Спарка и текущего KZ теста 2, Daniel — голос первого KZ теста,
// выбранный когда-то как раз на казахском.
const VOICES = argOf('--voices', 'Owen,Daniel,Noah,Grace,Emma').split(',').map((s) => s.trim())

// Фраза нарочно смешанная: казахский + вкраплённое английское слово и число —
// ровно то, что тьютор говорит каждую минуту (см. блок kz в agent.py). Голос,
// который спотыкается только на этом, слышно сразу.
const TEXT = argOf(
  '--text',
  'Сәлем! Бүгін past simple жасаймыз. Дайынсың ба? Кеттік, сен істейсің!',
)
const LANG = argOf('--lang', 'kk') // kk | ru | en — подсказка фонетики
const MODEL = process.env.SONIOX_TTS_MODEL || 'tts-rt-v1'
const SPEED = Number(argOf('--speed', '1.0'))
const OUT = path.join(ROOT, 'build', 'kz-audition')

const key = process.env.SONIOX_API_KEY
if (!key) {
  console.error('Нет SONIOX_API_KEY (.env.local в корне) — синтезировать нечем.')
  process.exit(1)
}

fs.mkdirSync(OUT, { recursive: true })
console.log(`Фраза: ${TEXT}\nЯзык фонетики: ${LANG} · модель: ${MODEL} · темп: ${SPEED}\n`)

let failed = 0
for (const voice of VOICES) {
  const res = await fetch('https://tts-rt.soniox.com/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, voice, language: LANG, text: TEXT, speed: SPEED, audio_format: 'mp3' }),
  })
  if (!res.ok) {
    failed++
    console.log(`  ✗ ${voice.padEnd(8)} ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`)
    continue
  }
  const file = path.join(OUT, `${voice}__${LANG}.mp3`)
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  console.log(`  ✓ ${voice.padEnd(8)} ${path.relative(ROOT, file)}`)
}

console.log(`\nГотово. Слушать: open ${path.relative(ROOT, OUT)}`)
if (failed) console.log(`Не синтезировано голосов: ${failed} (имя из каталога Soniox?)`)
