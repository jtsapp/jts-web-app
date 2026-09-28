// Озвучка аудирования финальных экзаменов (public/exam/<level>/exam.json).
//
// В исходниках методиста записей нет вовсе: вместо трека учебника там
// стенограмма на экране и синтез браузера («audio not available in this
// preview»). В курсе этих диалогов целиком тоже нет — только отдельные фразы.
// Поэтому записи делаем сами, один раз, и кладём в репозиторий рядом с
// экзаменом: на экране синтеза нет (браузерный — лотерея, а Soniox на лету
// упирался бы в лимит организации посреди экзамена).
//
// Диалог читается по ролям — у каждого говорящего свой голос (CAST): одним
// голосом на слух не понять, где вопрос, а где ответ, а вопросы экзамена как
// раз про то, КТО что сказал («What does C decide to order?»). Пол роли взят
// из реплик и вопросов («Only if she knew it was safe» → гостья — женщина).
// Между репликами — пауза: склеенные встык, они звучат одной фразой.
//
// Имя файла — хэш стенограммы (scripts/extract-level-exams.js,
// listeningAudioFile): правка реплики в исходнике даёт ровно одну новую запись.
// Готовые файлы без --force не трогаем — синтез недетерминирован, и
// перегенерация без причины меняла бы то, что уже прослушано.
//
//   node scripts/voice-level-exams.js [--level a1] [--dry] [--force] [--prune]
//
// Ключ SONIOX_API_KEY — из окружения или .env.local (см. make-lesson-audio.js).
const fs = require('node:fs')
const path = require('node:path')
const { stripId3 } = require('./voice-course-dialogs')

const ROOT = path.join(__dirname, '..')
const EXAM_DIR = path.join(ROOT, 'public', 'exam')

// Темп: у A0/A1 — как у материала курса (make-lesson-audio.js, 0.85), выше
// уровень — ближе к живой речи: аудирование B2 на 0.85 проверяло бы не то.
const SPEED = { a0: 0.85, a1: 0.85, a2: 0.9, b2: 1.0 }

const PAUSE_MS = 500

// Голоса — из каталога Soniox (src/lib/ttsShared.js: VOICE и TALE_VOICES).
// Ключ роли — ровно подпись говорящего в стенограмме (sp).
const CAST = {
  a0: {
    l1: { I: 'Grace', J: 'Oliver' }, // собеседование, Jack
    l2: { M: 'Owen', A: 'Freya' }, // Anja
    l3: { A: 'Grace', B: 'Daniel' },
    l4: { A: 'Freya', B: 'Oliver', W: 'Iris' }, // W — официант
  },
  a1: {
    l1: { L: 'Daniel', C: 'Freya', M: 'Nigel' }, // M — продавец на фуд-корте
    l2: { A: 'Grace', B: 'Owen' },
    l3: { I: 'Oliver', O: 'Victoria' }, // O — организатор, «She isn't sure yet»
    l4: { Narrator: 'Freya' },
  },
  a2: {
    l1: { A: 'Grace', B: 'Oliver' }, // звонящая: «She needs to check her dates»
    l2: { Narrator: 'Arthur' },
    l3: { P: 'Owen', M: 'Isla' }, // гостья: «Only if she knew it was safe»
    l4: { P: 'Freya', J: 'Oliver' },
  },
  b2: {
    l1: { Speaker: 'Freya' },
    l2: { Narrator: 'Oliver' },
    l3: { Narrator: 'Victoria' },
    l4: { 'Speaker 1': 'Isla', 'Speaker 3': 'Daniel' }, // «if she'd had more children»
  },
}

// Layer III: килобит/с по индексу заголовка — MPEG-1 и MPEG-2/2.5 отдельно.
const KBPS = {
  mpeg1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  mpeg2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}
// Частота по биту версии: 3 — MPEG-1, 2 — MPEG-2, 0 — MPEG-2.5.
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }

/**
 * Тишина в формате самой записи: кадры с тем же заголовком и нулями вместо
 * данных — декодер читает их как тишину (тот же приём, что у тихого mp3 в
 * tests/listenchoose.spec.js). Формат берём с живого ответа Soniox, а не
 * зашиваем: чужая частота посреди потока сбила бы длительность у плеера.
 * Незнакомый формат (CRC, свободный битрейт) — паузы не будет, но и порчи.
 */
function silenceLike(mp3, ms) {
  const body = stripId3(mp3)
  if (body.length < 4) return Buffer.alloc(0)
  const h = body.readUInt32BE(0)
  const ver = (h >>> 19) & 3
  const layer = (h >>> 17) & 3
  const noCrc = (h >>> 16) & 1
  const br = (h >>> 12) & 15
  const sr = (h >>> 10) & 3
  if (h >>> 21 !== 0x7ff || layer !== 1 || !noCrc || ver === 1 || br === 0 || br === 15 || sr === 3) return Buffer.alloc(0)
  const mpeg1 = ver === 3
  const rate = RATES[ver][sr]
  const kbps = (mpeg1 ? KBPS.mpeg1 : KBPS.mpeg2)[br]
  const size = Math.floor(((mpeg1 ? 144 : 72) * kbps * 1000) / rate)
  const frame = Buffer.alloc(size)
  // Тот же заголовок, но без байта выравнивания: размер кадра выше посчитан без него.
  frame.writeUInt32BE((h & ~(1 << 9)) >>> 0, 0)
  const count = Math.round(((ms / 1000) * rate) / (mpeg1 ? 1152 : 576))
  return Buffer.concat(Array.from({ length: count }, () => frame))
}

function examLevels() {
  if (!fs.existsSync(EXAM_DIR)) return []
  return fs
    .readdirSync(EXAM_DIR)
    .filter((d) => fs.existsSync(path.join(EXAM_DIR, d, 'exam.json')))
    .sort()
}

/** Что озвучить на уровне: запись за записью, реплика за репликой с голосом. */
function plan(level) {
  const exam = JSON.parse(fs.readFileSync(path.join(EXAM_DIR, level, 'exam.json'), 'utf8'))
  const cast = CAST[level]
  if (!cast) throw new Error(`${level}: нет раскладки голосов в CAST`)
  const listening = exam.sections.find((s) => s.key === 'listening')
  return listening.passages.map((p) => {
    const roles = cast[p.id]
    if (!roles) throw new Error(`${level}/${p.id}: нет голосов в CAST`)
    const lines = p.lines.map((l) => {
      const voice = roles[l.sp]
      if (!voice) throw new Error(`${level}/${p.id}: нет голоса для роли «${l.sp}»`)
      return { voice, text: l.t }
    })
    return { id: p.id, audio: p.audio, file: path.join(EXAM_DIR, level, 'audio', p.audio), lines }
  })
}

async function run() {
  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`)
    return i > 0 ? process.argv[i + 1] : null
  }
  const only = arg('level')
  const dry = process.argv.includes('--dry')
  const force = process.argv.includes('--force')
  const prune = process.argv.includes('--prune')
  const levels = only ? [only.toLowerCase()] : examLevels()
  if (!levels.length) throw new Error('нет public/exam/<level>/exam.json — сначала node scripts/extract-level-exams.js')

  let synth = null
  for (const level of levels) {
    const items = plan(level)
    const todo = items.filter((it) => force || !fs.existsSync(it.file))
    console.log(`${level}: записей ${items.length}, к озвучке ${todo.length}, темп ${SPEED[level]}`)
    if (dry) {
      for (const it of todo) {
        console.log(`  ${it.audio}  ${it.lines.map((l) => `${l.voice}: ${l.text.slice(0, 36)}`).join(' | ')}`)
      }
      continue
    }
    if (todo.length && !synth) {
      synth = require('./make-lesson-audio')
      synth.loadEnv()
    }
    for (const it of todo) {
      const parts = []
      for (const [i, line] of it.lines.entries()) {
        const mp3 = await synth.synthesizeSoniox(line.text, { voice: line.voice, speed: SPEED[level] })
        // ID3-тег Soniox оставляем только в начале файла — посреди потока он мусор.
        if (i > 0) parts.push(silenceLike(mp3, PAUSE_MS), stripId3(mp3))
        else parts.push(mp3)
        await synth.sleep(synth.SONIOX_GAP_MS)
      }
      fs.mkdirSync(path.dirname(it.file), { recursive: true })
      fs.writeFileSync(it.file, Buffer.concat(parts))
      console.log(`  записано ${it.audio} (${it.id}, реплик ${it.lines.length})`)
    }
    if (prune) {
      const keep = new Set(items.map((it) => it.audio))
      const dir = path.join(EXAM_DIR, level, 'audio')
      for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
        if (keep.has(f)) continue
        fs.rmSync(path.join(dir, f))
        console.log(`  удалено ${f} — стенограммы с таким хэшем больше нет`)
      }
    }
  }
}

module.exports = { CAST, SPEED, PAUSE_MS, silenceLike, plan, examLevels }

if (require.main === module) {
  run().catch((e) => {
    console.error(e.message || e)
    process.exit(1)
  })
}
