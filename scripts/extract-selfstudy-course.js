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

  // Видео B2 в файл курса не вшито — оно ссылается на внешний ролик
  // (videos/nav_B2_report_unit7_olb.mp4). Те же ролики уже лежат в репозитории
  // с прошлой выгрузки как video/v<юнит>.mp4, поэтому связываем их по номеру
  // юнита в имени, а не тащим заново.
  const videoUrl = (file) => {
    const m = /unit(\d+)/i.exec(String(file || ''))
    if (!m) return null
    const name = `v${m[1]}.mp4`
    return fs.existsSync(path.join(outDir, 'video', name)) ? `/course/${course.level}/video/${name}` : null
  }

  const makeCtx = (lessonKey) => ({
    lang: 'ru',
    level: course.level,
    video: videoUrl,
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

  const GRADED = ['choice', 'listen', 'gap', 'order', 'match', 'group', 'rows', 'mistake', 'cols', 'cloze']
  // Порог сдачи курс пишет двумя способами: числом вопросов (B1: 21 из 30) и
  // процентом (B2: 70). Различаем по величине — процент больше, чем вопросов.
  const passMark = (raw, items) => {
    if (!raw) return Math.ceil(items * PASS_RATIO)
    return raw > items ? Math.ceil((items * raw) / 100) : raw
  }

  const tests = []
  for (const test of course.tests) {
    const steps = lessonSteps(test, course.perItem, makeCtx(test.key))
    const graded = steps.filter((s) => GRADED.includes(s.type)).length
    const declaredPass = test.pass || (test.groups || []).reduce((p, g) => p || (g && g.pass) || 0, 0)
    const pass = passMark(declaredPass, graded)

    // Большой тест уровня (B2: четыре блочных и финальный) — свой узел тропы
    // X<id> после юнита, а не тест юнита T<u>.
    if (test.exam) {
      const id = test.exam.final ? 'f' : `t${Math.max(1, Math.ceil((test.exam.to || 0) / 4))}`
      const after = test.exam.after ? Math.ceil(test.exam.after / 4) : course.units.length
      const name = `steps-X${id}.json`
      fs.writeFileSync(
        path.join(outDir, name),
        `${JSON.stringify({ n: id, title: test.title, blurb: test.blurb || '', passRatio: graded ? pass / graded : null, steps }, null, 0)}\n`,
      )
      // passRatio читает плеер (exam = passRatio != null): без него большой
      // тест нельзя провалить — итог всегда «сдано».
      kept.add(name)
      tests.push({
        id,
        kind: test.exam.final ? 'Final' : 'Test',
        title: test.title,
        blurb: test.blurb || '',
        after,
        lo: test.exam.from,
        hi: test.exam.to,
        items: graded,
        pass,
      })
      continue
    }

    const unit = test.unit
    if (!unit) continue
    const title = test.title || `Тест юнита ${unit}`
    const name = `steps-T${unit}.json`
    fs.writeFileSync(
      path.join(outDir, name),
      `${JSON.stringify({ n: unit, title, blurb: plain(test.blurb, 'ru'), passRatio: graded ? pass / graded : null, steps }, null, 0)}\n`,
    )
    kept.add(name)
    tests.push({ unit, title, items: graded, pass })
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
      // Картинки слов и видео-репортажи в файл курса не вшиты: они лежат в
      // репозитории с прошлой выгрузки, и пересборка их не восстановит.
      if (entry === 'img' || entry === 'video' || kept.has(entry)) continue
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
