// Вытаскивает ветку Self-Study курса Just to Study (единый файл уровня
// a0.html / a1.html) в нативные данные раздела «Обучение».
//
// Источник — именно исходный файл курса, а не опубликованные админкой уроки:
// конвертер вырезает из них ключи ответов (ни data-answer, ни <select>, ни
// data-why), и проверять в плеере было бы нечего.
//
// Пишет:
//   public/learning/<level>.json — задания узлов тропы
//   public/learning/index.json   — каталог уровней и тропы
// Аудио не выгружается: треки уже опубликованы вместе с бандлом уровня.
//
// Запуск (a1.html — 257 МБ, потому увеличенная куча):
//   node --max-old-space-size=8192 scripts/extract-jts-self-lessons.js \
//     --src ~/Downloads/a0.html --src ~/Downloads/a1.html
const fs = require('node:fs')
const path = require('node:path')
const { readCourse } = require('./jts-self/read-course')
const { collectLesson } = require('./jts-self/collect-lesson')
const { buildLessonNodes, buildReviewNode, lessonType } = require('./jts-self/build-nodes')
const { vocabCardsTask, imageSlug } = require('./jts-self/vocab-cards')

const OUT = path.join(__dirname, '..', 'public/learning')

// Локальный staging медиа — в .gitignore; в git уходит только лёгкий JSON.
const MEDIA_DIR = path.join(OUT, 'media')
const MEDIA_URL_BASE = 'https://files-api.iqra.space/development/learning-media'

/** Пишет картинки слов урока и возвращает слово → публичная ссылка. */
function writeImages(lesson, level) {
  const dir = path.join(MEDIA_DIR, level)
  const urls = {}
  for (const [word, uri] of Object.entries(lesson.images || {})) {
    const m = /^data:image\/([a-z]+);base64,(.+)$/s.exec(String(uri))
    if (!m) continue
    const file = `${imageSlug(word)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, file), Buffer.from(m[2], 'base64'))
    urls[word] = `${MEDIA_URL_BASE}/${level}/${file}`
  }
  return urls
}

function extractCourse(filePath) {
  const course = readCourse(filePath)
  const reviewsByUnit = new Map(course.reviews.map((r) => [r.unit, r]))

  const nodes = []
  const seenUnits = new Set()

  for (const lesson of course.lessons) {
    // Юнит закрывается своим тестом: как только начался следующий юнит,
    // выкладываем тест предыдущего.
    if (!seenUnits.has(lesson.unit)) {
      for (const unit of seenUnits) {
        const review = reviewsByUnit.get(unit)
        if (review && !review.__done) {
          review.__done = true
          nodes.push(buildReviewNode({ review, level: course.level, stages: collectLesson(review.html) }))
        }
      }
      seenUnits.add(lesson.unit)
    }
    const imageUrls = writeImages(lesson, course.level)
    const cards = vocabCardsTask(lesson, (word) => imageUrls[word] || null)
    const lessonNodes = buildLessonNodes({ lesson, level: course.level, stages: collectLesson(lesson.html) })
    if (cards) {
      const vocabNode = lessonNodes.find((n) => /vocab|words/i.test(n.title))
      if (vocabNode) vocabNode.tasks.unshift(cards)
      // Без узла со словом "vocab"/"words" в заголовке карточки словаря
      // некуда врезать — раньше это молча проглатывалось. Если стадию
      // словаря в источнике переименуют, карточки тихо пропадут с тропы;
      // предупреждение в CLI делает такую потерю заметной сразу при генерации.
      else {
        console.warn(
          `предупреждение: карточки словаря урока ${lesson.no} (${lesson.title || 'без названия'}) ` +
            `не вставлены — среди стадий нет узла с "vocab"/"words" в заголовке: ` +
            `[${lessonNodes.map((n) => n.title).join(', ')}]`
        )
      }
    }
    nodes.push(...lessonNodes)
  }
  for (const review of course.reviews) {
    if (!review.__done) nodes.push(buildReviewNode({ review, level: course.level, stages: collectLesson(review.html) }))
  }

  const lessons = {}
  const catalog = []
  for (const node of nodes) {
    if (!node.tasks.length) continue
    const order = catalog.length
    lessons[node.code] = { code: node.code, title: node.title, tasks: node.tasks }
    catalog.push({ code: node.code, order, title: node.title, taskCount: node.tasks.length, type: lessonType(node.code, node.tasks), unit: node.unit })
  }

  return { level: course.level, label: course.label, lessons, catalog }
}

function parseSources() {
  const out = []
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--src' && process.argv[i + 1]) out.push(process.argv[i + 1])
  }
  return out
}

function run() {
  const sources = parseSources()
  if (!sources.length) {
    console.error('нужен хотя бы один --src <файл курса>')
    process.exit(1)
  }

  const indexPath = path.join(OUT, 'index.json')
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

  for (const src of sources) {
    const { level, label, lessons, catalog } = extractCourse(src)
    fs.writeFileSync(path.join(OUT, `${level}.json`), JSON.stringify({ lessons }))

    index[level] = { lessons: catalog }
    const entry = { code: level, label, lessonCount: catalog.length }
    const at = index.levels.findIndex((l) => l.code === level)
    if (at >= 0) index.levels[at] = entry
    else index.levels.unshift(entry)

    const kb = (fs.statSync(path.join(OUT, `${level}.json`)).size / 1024) | 0
    console.log(`${level}: ${catalog.length} узлов → ${level}.json (${kb} KB)`)
  }

  index.levels.sort((a, b) => a.code.localeCompare(b.code))
  fs.writeFileSync(indexPath, JSON.stringify(index))
  console.log(`index.json: уровней ${index.levels.length}`)
}

if (require.main === module) run()

module.exports = { extractCourse }
