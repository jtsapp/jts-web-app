// Озвучка диалогов, которых нет в записях курса.
//
// Два источника, оба — тексты самого курса, а не придуманные сверху:
//
//   1. Задания, чей клип в банке курса отсутствует, а рядом лежит fallback —
//      текст, который движок курса в этом случае читает синтезом устройства
//      (A0, уроки 21 и 24: «AI-generated» дорожки так и не записали).
//      Реплики разделены « — »; экстрактор ищет запись по тексту fallback
//      целиком (steps.js, voiced).
//   2. Правки `lines` в scripts/selfstudy/clip-fixes.js: записи ответа нет ни в
//      клипе, ни в целом треке прошлой выгрузки (A0: «Gary says: Nice to meet
//      you, Sally», а клип кончается на «Hi, I'm Sally»).
//
// Диалог читается двумя голосами — одним на слух не понять, где вопрос, а где
// ответ. Темп — как у материала урока (0.85). Файл называется хэшем текста
// всех реплик (jts-self/say-audio.js) и лежит рядом с озвучкой слов:
// public/learning/audio/<level>/.
//
//   node scripts/voice-course-dialogs.js --src ~/Downloads/jts-a0-course.html [--dry] [--force]
//   node scripts/voice-course-dialogs.js --level a1 [--dry]   # только правки lines
//
// Ключ SONIOX_API_KEY — из .env.local (см. make-lesson-audio.js).
const fs = require('node:fs')
const path = require('node:path')
const { sayAudioFile } = require('./jts-self/say-audio')
const { FIXES, dialogText } = require('./selfstudy/clip-fixes')

const ROOT = path.join(__dirname, '..')
const VOICES = ['Noah', 'Grace']

// Каждый ответ Soniox начинается с ID3v2-тега (44 байта: «TSSE Lavf…»).
// Склеенные как есть, реплики несли по тегу посреди потока — проверка кадров
// показала 132 байта мусора между ними. Браузеры обычно такое проглатывают,
// но плеер вправе споткнуться; поэтому тег оставляем только у первой реплики.
function stripId3(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return buf
  // Размер тега — synchsafe-число: по 7 бит в каждом из четырёх байтов.
  const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]
  const footer = buf[5] & 0x10 ? 10 : 0
  return buf.subarray(10 + size + footer)
}

// fallback курса: «Hello. Are you here on business? — No, I'm not. …» —
// реплики через тире, собеседники по очереди. Монолог — одним женским голосом.
function fallbackLines(text) {
  const parts = String(text)
    .split(/\s+—\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 1) return [['Grace', parts[0]]]
  return parts.map((line, i) => [VOICES[i % 2], line])
}

/** Диалоги уровня: fallback-тексты заданий без клипа и правки lines. */
function dialogsOf(level, course) {
  const out = new Map()
  if (course) {
    const { flattenGroups } = require('./selfstudy/steps')
    const has = (lesson, key) => course.audio[`${lesson}:${key}`] || course.audio[key]
    for (const l of [...course.lessons, ...course.tests]) {
      for (const sc of flattenGroups(l.groups, course.perItem)) {
        if (!sc.fallback || !sc.clip) continue
        const m = /^l(\d+)_(.+)$/.exec(sc.clip)
        if (has(l.key, sc.clip) || (m && has(m[1], m[2]))) continue
        out.set(sc.fallback, fallbackLines(sc.fallback))
      }
    }
  }
  for (const keys of Object.values(FIXES[level] || {})) {
    for (const fix of Object.values(keys)) if (fix.lines) out.set(dialogText(fix.lines), fix.lines)
  }
  return [...out].map(([text, lines]) => ({ text, lines }))
}

async function run() {
  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`)
    return i > 0 ? process.argv[i + 1] : null
  }
  const src = arg('src')
  let level = arg('level')
  let course = null
  if (src) {
    const { readSelfStudyCourse } = require('./selfstudy/read-course')
    course = readSelfStudyCourse(src)
    level = course.level
  }
  if (!level) throw new Error('нужен --src <файл курса.html> или --level <код>')

  const dry = process.argv.includes('--dry')
  const force = process.argv.includes('--force')
  const dir = path.join(ROOT, 'public/learning/audio', level)
  const todo = dialogsOf(level, course).filter(({ text }) => force || !fs.existsSync(path.join(dir, sayAudioFile(text))))
  console.log(`${level}: диалогов к озвучке ${todo.length}`)
  if (dry) {
    for (const d of todo) console.log(`  ${sayAudioFile(d.text)}  ${d.lines.map(([v, t]) => `${v}: ${t}`).join(' | ')}`)
    return
  }
  const { synthesizeSoniox, sleep, loadEnv, SONIOX_GAP_MS } = require('./make-lesson-audio')
  loadEnv()
  fs.mkdirSync(dir, { recursive: true })
  for (const { text, lines } of todo) {
    const parts = []
    for (const [voice, line] of lines) {
      const mp3 = await synthesizeSoniox(line, { voice, speed: 0.85 })
      parts.push(parts.length ? stripId3(mp3) : mp3)
      await sleep(SONIOX_GAP_MS)
    }
    // MP3 одного кодировщика склеивается побайтно: кадры независимы.
    fs.writeFileSync(path.join(dir, sayAudioFile(text)), Buffer.concat(parts))
    console.log(`записано ${sayAudioFile(text)}  «${text}»`)
  }
}

module.exports = { stripId3, fallbackLines, dialogsOf }

if (require.main === module) {
  run().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
