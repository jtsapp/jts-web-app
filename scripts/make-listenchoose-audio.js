// Озвучка описаний «Слушай и выбирай»: 150 записей, по одной на задание.
//
// Прототип читал описания браузерным синтезом, а в приложении синтеза в этом
// разделе НЕТ вовсе (решение владельца, 2026-09-20): звучит только запись —
// одинаково на любом устройстве, с точной длительностью и перемоткой. Поэтому
// записи делаются здесь и едут в репозиторий: платить за один и тот же текст на
// каждое открытие задания незачем.
//
// Провайдер — Soniox (SONIOX_API_KEY из .env.local; в worktree его надо
// положить рядом, свой .env.local у каждого дерева). Синтез, повторы при
// лимите и паузы между запросами — тот же код, что у озвучки уроков
// (scripts/make-lesson-audio.js): у Soniox лимит запросов в минуту, и сотня
// подряд без пауз упирается в него на середине набора.
//
// Имя файла — хэш текста (sayAudioFile, как у озвучки уроков), а не номер
// задания: правка описания в прототипе меняет хэш, и перегенерируется ровно
// одна запись, а не сдвигается вся нумерация. Имя уже записано в поле `audio`
// файла questions.json (его делает scripts/extract-listenchoose.js), поэтому
// скрипт только читает готовый список.
//
// Запуск:
//   node scripts/make-listenchoose-audio.js              # всё, чего нет
//   node scripts/make-listenchoose-audio.js --dry        # показать план, без запросов
//   node scripts/make-listenchoose-audio.js --limit 1    # пробный клип
//   node scripts/make-listenchoose-audio.js --voice Grace --force   # заново другим голосом
//
// Существующие файлы без --force не трогаются: запись на месте старой — это
// платный запрос и потерянный оригинал.

const fs = require('node:fs')
const path = require('node:path')
const { synthesizeSoniox, sleep, loadEnv, SONIOX_GAP_MS } = require('./make-lesson-audio.js')

const ROOT = path.join(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const QUESTIONS = path.join(PUBLIC, 'practice', 'listenchoose', 'questions.json')

// Owen — диктор словаря уроков. Описание читает диктор, а не персонаж, поэтому
// голос один на все 150 записей. Темп 0.95, как у связного материала уроков:
// ниже разговорного, но не тянет; ещё замедлить студент может сам в плеере.
const DEFAULT_VOICE = process.env.LISTENCHOOSE_TTS_VOICE || 'Owen'
const DEFAULT_SPEED = 0.95

function parseArgs(argv) {
  const out = { dry: false, force: false, limit: Infinity, voice: DEFAULT_VOICE, speed: DEFAULT_SPEED }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry') out.dry = true
    else if (a === '--force') out.force = true
    else if (a === '--limit') {
      const n = Number(argv[++i])
      if (!Number.isInteger(n) || n < 1) throw new Error('--limit: нужно целое число от 1')
      out.limit = n
    } else if (a === '--voice') {
      out.voice = argv[++i]
      if (!out.voice) throw new Error('--voice: не указан голос')
    } else if (a === '--speed') {
      // Диапазон провайдера [0.7–1.3], см. make-lesson-audio.js.
      const n = Number(argv[++i])
      if (!(n >= 0.7 && n <= 1.3)) throw new Error('--speed: число от 0.7 до 1.3')
      out.speed = n
    } else throw new Error(`неизвестный флаг ${a}`)
  }
  return out
}

/**
 * Что озвучивать. Порядок — порядок банка, `limit` отсекает уже ОТОБРАННОЕ:
 * `--limit 1` берёт первую недостающую запись, а не первую вообще.
 */
function planAudio(questions, { exists = (file) => fs.existsSync(file), force = false, limit = Infinity } = {}) {
  const plan = []
  const seen = new Set()
  for (const q of questions) {
    const out = path.join(PUBLIC, q.audio.replace(/^\//, ''))
    // Одинаковый текст — один файл: второй запрос платный и ничего не добавит.
    if (seen.has(out)) continue
    seen.add(out)
    if (!force && exists(out)) continue
    plan.push({ id: q.id, text: q.text, file: path.basename(out), out })
    if (plan.length >= limit) break
  }
  return plan
}

// Провайдер иногда отвечает 200 и телом-ошибкой; в репозиторий, а потом в
// плеер, такой «mp3» попадать не должен.
function looksLikeMp3(buf) {
  if (!buf || buf.length < 1000) return false
  if (buf.toString('latin1', 0, 3) === 'ID3') return true
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
}

/**
 * Озвучивает план: синтез → проверка, что пришёл mp3 → запись файла. Синтез
 * подставляется параметром, поэтому путь записи (не затираем существующие,
 * отвергаем не-mp3) проверяется без сети.
 */
async function generate(plan, { synthesize, gapMs = 0, force = false, log = () => {} }) {
  let done = 0
  let bytes = 0
  for (const item of plan) {
    let mp3
    try {
      mp3 = await synthesize(item.text)
    } catch (e) {
      // Дыру в наборе молча не оставляем: тест данных красный, пока записи нет.
      throw new Error(`${item.id}: ${e.message || e}`)
    }
    if (!looksLikeMp3(mp3)) throw new Error(`${item.id}: провайдер вернул не mp3 (${mp3.length} байт): ${mp3.toString('utf8', 0, 200)}`)
    fs.mkdirSync(path.dirname(item.out), { recursive: true })
    // 'wx' — не затираем чужой файл, если он появился между планом и записью.
    fs.writeFileSync(item.out, mp3, { flag: force ? 'w' : 'wx' })
    done++
    bytes += mp3.length
    if (done % 10 === 0 || done === plan.length) log(`  ${done}/${plan.length} — ${(bytes / 1048576).toFixed(1)} МБ`)
    if (gapMs) await sleep(gapMs)
  }
  return { done, bytes }
}

async function run(argv = process.argv.slice(2)) {
  loadEnv()
  const args = parseArgs(argv)
  const { questions } = JSON.parse(fs.readFileSync(QUESTIONS, 'utf8'))
  const plan = planAudio(questions, args)
  const words = plan.reduce((n, p) => n + p.text.trim().split(/\s+/).length, 0)
  console.log(`нужно записей: ${plan.length} из ${questions.length} (слов ${words}), голос ${args.voice}, темп ${args.speed}`)
  if (args.dry) {
    for (const item of plan) console.log(`  ${item.file}  ${item.id}  «${item.text.slice(0, 70)}${item.text.length > 70 ? '…' : ''}»`)
    return
  }
  if (!plan.length) {
    console.log('всё уже озвучено')
    return
  }
  const { done, bytes } = await generate(plan, {
    synthesize: (text) => synthesizeSoniox(text, { voice: args.voice, speed: args.speed }),
    gapMs: SONIOX_GAP_MS,
    force: args.force,
    log: console.log,
  })
  console.log(`готово: ${done} записей, ${(bytes / 1048576).toFixed(1)} МБ.`)
}

if (require.main === module) {
  run().catch((e) => {
    console.error(String(e.message || e))
    process.exit(1)
  })
}

module.exports = { generate, looksLikeMp3, parseArgs, planAudio }
