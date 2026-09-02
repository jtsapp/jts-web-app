// Выгружает self-study курс нового поколения (jts-<уровень>-course.html) в
// данные раздела «Обучение»: public/course/<level>/.
//
// Курс приходит одним файлом на уровень: разметка, движок, задания и все
// записи в base64. Плееру нужны только шаги и медиа, поэтому ни оболочку, ни
// движок, ни стили курса мы не выгружаем — их всё равно никто не грузит
// (см. loadCourseSteps в src/learning/courseData.js).
//
// Пишет:
//   public/course/<level>/index.json      — юниты, уроки, тесты
//   public/course/<level>/steps-<n>.json  — шаги урока
//   public/course/<level>/steps-T<u>.json — шаги теста юнита
//   public/course/<level>/audio/<хэш>.mp3 — записи курса (дедуп по содержимому)
//
// Картинки слов НЕ приходят из этого источника — в нём их нет вовсе, только
// имена иконок. Поэтому карточка берёт фото из уже выгруженного
// public/course/<level>/img-index.json: слово то же, снимок тот же.
//
// Запуск (a1 — 36 МБ, нужна увеличенная куча):
//   node --max-old-space-size=8192 scripts/extract-selfstudy-course.js \
//     --src ~/Downloads/jts-a0-course.html --prune
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { readSelfStudyCourse } = require('./selfstudy/read-course')
const { lessonSteps, plain } = require('./selfstudy/steps')
const { sayAudioFile, sayAudioUrl } = require('./jts-self/say-audio')

const ROOT = path.join(__dirname, '..')

function args(name) {
  const out = []
  process.argv.forEach((a, i) => {
    if (a === `--${name}`) out.push(process.argv[i + 1])
  })
  return out
}
const SRCS = args('src')
const PRUNE = process.argv.includes('--prune')
if (!SRCS.length) {
  console.error('нужен хотя бы один --src <файл курса.html> (можно несколько)')
  process.exit(1)
}

/** Записи курса на диск: одинаковый клип пишем один раз. */
function writeAudio(course, outDir) {
  const dir = path.join(outDir, 'audio')
  fs.mkdirSync(dir, { recursive: true })
  const byKey = new Map()
  const written = new Set()
  for (const [key, b64] of Object.entries(course.audio)) {
    const buf = Buffer.from(b64, 'base64')
    const name = `${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12)}.mp3`
    const file = path.join(dir, name)
    if (!written.has(name)) {
      fs.writeFileSync(file, buf)
      written.add(name)
    }
    byKey.set(key, `/course/${course.level}/audio/${name}`)
  }
  return { byKey, written }
}

// Ключ слова для поиска фото: регистр, апостроф и знаки препинания у двух
// поколений курса пишутся по-разному («don’t like» против «don't like»), и
// точное совпадение находило 16 слов A0 из 266 вместо 51.
const imgKey = (w) =>
  String(w || '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z' ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Фото слова из прошлой выгрузки курса (нового источника картинок нет). */
function imageIndex(outDir) {
  const file = path.join(outDir, 'img-index.json')
  if (!fs.existsSync(file)) return new Map()
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    return new Map(Object.keys(raw).map((k) => [imgKey(k), raw[k]]))
  } catch {
    return new Map()
  }
}

/** Записанная озвучка слова (scripts/make-lesson-audio.js), если она есть. */
function wordAudioLookup(level) {
  const dir = path.join(ROOT, 'public/learning/audio', level)
  return (word) => {
    if (!word) return null
    return fs.existsSync(path.join(dir, sayAudioFile(word))) ? sayAudioUrl(level, word) : null
  }
}

// Порог теста: столько же, сколько ставит сам курс (70% вопросов).
const PASS_RATIO = 0.7

function build(file) {
  const course = readSelfStudyCourse(file)
  const outDir = path.join(ROOT, 'public/course', course.level)
  fs.mkdirSync(outDir, { recursive: true })

  const { byKey, written } = writeAudio(course, outDir)
  const imgs = imageIndex(outDir)
  const wordAudio = wordAudioLookup(course.level)

  const makeCtx = (lessonKey) => ({
    lang: 'ru',
    level: course.level,
    // Ключ клипа у A0/A2 живёт внутри урока, у A1 — общий на уровень: пробуем
    // сначала «урок:ключ», потом голый ключ.
    clip: (key) => byKey.get(`${lessonKey}:${key}`) || byKey.get(key) || null,
    img: (word) => imgs.get(imgKey(word)) || null,
    wordAudio,
  })

  const kept = new Set(['index.json', 'img-index.json'])
  const lessons = []
  let stepCount = 0
  for (const lesson of course.lessons) {
    const steps = lessonSteps(lesson, course.perItem, makeCtx(lesson.key))
    stepCount += steps.length
    const name = `steps-${lesson.no}.json`
    // Подпись урока у A0 в меню курса трёхъязычная, у A1/A2 — строкой. Плеер
    // печатает её как есть, поэтому объект сюда попасть не должен.
    const blurb = plain(lesson.blurb, 'ru')
    fs.writeFileSync(
      path.join(outDir, name),
      `${JSON.stringify({ n: lesson.no, title: lesson.title, blurb, steps }, null, 0)}\n`,
    )
    kept.add(name)
    lessons.push({ n: lesson.no, unit: lesson.unit, no: lesson.no, title: lesson.title, blurb })
  }

  const tests = []
  for (const test of course.tests) {
    const unit = test.unit
    if (!unit) continue
    const steps = lessonSteps(test, course.perItem, makeCtx(test.key))
    const graded = steps.filter((s) => ['choice', 'listen', 'gap', 'order', 'match', 'group', 'rows', 'mistake', 'cols'].includes(s.type)).length
    const title = test.title || `Тест юнита ${unit}`
    const name = `steps-T${unit}.json`
    fs.writeFileSync(path.join(outDir, name), `${JSON.stringify({ n: unit, title, blurb: '', steps }, null, 0)}\n`)
    kept.add(name)
    tests.push({ unit, title, items: graded, pass: Math.ceil(graded * PASS_RATIO) })
  }

  // Юниты каталога: имя юнита и заголовки его уроков — как читает courseTrail.
  const units = course.units.map((u) => [
    u.title,
    lessons.filter((l) => l.unit === u.no).map((l) => l.title),
  ])
  fs.writeFileSync(
    path.join(outDir, 'index.json'),
    `${JSON.stringify({ level: course.level, units, lessons, tests }, null, 0)}\n`,
  )

  // Старые файлы уровня: разметка урока, движок и стили прошлого поколения
  // курса, а также шаги уроков, которых в новом источнике уже нет.
  let removed = 0
  if (PRUNE) {
    for (const entry of fs.readdirSync(outDir)) {
      const full = path.join(outDir, entry)
      if (entry === 'audio') {
        for (const f of fs.readdirSync(full)) {
          if (!written.has(f)) {
            fs.rmSync(path.join(full, f))
            removed++
          }
        }
        continue
      }
      if (entry === 'img' || kept.has(entry)) continue
      fs.rmSync(full, { recursive: true })
      removed++
    }
  }

  console.log(
    `${course.level}: уроков ${lessons.length}, тестов ${tests.length}, шагов ${stepCount}, ` +
      `аудио ${written.size}${PRUNE ? `, удалено старых файлов ${removed}` : ''}`,
  )
  return { level: course.level, lessons: lessons.length, tests: tests.length, steps: stepCount, audio: written.size, removed }
}

const summary = SRCS.map(build)
const totalSteps = summary.reduce((n, s) => n + s.lessons, 0)
if (!totalSteps) {
  console.error('ни один урок не собран — проверьте --src')
  process.exit(1)
}
