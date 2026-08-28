// Вытаскивает ветку Self-Study курса Just to Study (единый файл уровня
// a0.html / a1.html) в нативные данные раздела «Обучение».
//
// Источник — именно исходный файл курса, а не опубликованные админкой уроки:
// конвертер вырезает из них ключи ответов (ни data-answer, ни <select>, ни
// data-why), и проверять в плеере было бы нечего.
//
// Пишет:
//   public/learning/<level>.json  — задания узлов тропы
//   public/learning/index.json    — каталог уровней и тропы
//   public/learning/img/<level>/  — картинки слов, WebP (в git, раздаёт сайт)
// Аудио не выгружается: треки уже опубликованы вместе с бандлом уровня.
//
// Запуск (a1.html — 257 МБ, потому увеличенная куча):
//   node --max-old-space-size=8192 scripts/extract-jts-self-lessons.js \
//     --src ~/Downloads/a0.html --src ~/Downloads/a1.html
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const { readCourse } = require('./jts-self/read-course')
const { collectLesson } = require('./jts-self/collect-lesson')
const { buildLessonNodes, buildReviewNode, lessonType } = require('./jts-self/build-nodes')
const { vocabCardsTask, imageSlug } = require('./jts-self/vocab-cards')
// Привязка записей вынесена в отдельный модуль: её гоняют и без исходного
// html уровня — см. scripts/link-lesson-audio.js.
const { attachNarration } = require('./jts-self/attach-audio')

const OUT = path.join(__dirname, '..', 'public/learning')

// Картинки слов лежат в самом репозитории и раздаются сайтом.
//
// Раньше они шли отдельным ручным шагом: экстрактор писал JPEG в
// .gitignore-staging, а заливка в бакет делалась руками через `mc mirror`.
// Шага никто не сделал — все 195 картинок A0 отдавали 404 на обоих файл-
// серверах, и словарь весь этот срок был текстовым. Ссылка на чужой хост
// ничего не давала и по весу: свои файлы раздаются с кэш-заголовками сайта.
const IMG_DIR = path.join(OUT, 'img')
const IMG_URL_BASE = '/learning/img'

// Карточка словаря — 160×215 CSS-пикселей (.cp-word в course.css), то есть
// 320 пикселей ширины хватает и на экран с двойной плотностью. Источник даёт
// 470–560 px JPEG по ~33 КБ: на слабом канале стадия словаря из 24 слов — это
// почти мегабайт ради картинок, которые всё равно ужмутся до 160 px. WebP на
// 320 px даёт те же ~12 КБ, вчетверо меньше.
const IMG_WIDTH = 320
const IMG_QUALITY = 72

/** Пишет картинки слов урока и возвращает слово → ссылка на сайте. */
async function writeImages(lesson, level) {
  const dir = path.join(IMG_DIR, level)
  const urls = {}
  for (const [word, uri] of Object.entries(lesson.images || {})) {
    const m = /^data:image\/([a-z]+);base64,(.+)$/s.exec(String(uri))
    if (!m) continue
    const file = `${imageSlug(word)}.webp`
    fs.mkdirSync(dir, { recursive: true })
    const webp = await sharp(Buffer.from(m[2], 'base64'))
      .resize({ width: IMG_WIDTH, withoutEnlargement: true })
      .webp({ quality: IMG_QUALITY })
      .toBuffer()
    fs.writeFileSync(path.join(dir, file), webp)
    urls[word] = `${IMG_URL_BASE}/${level}/${file}`
  }
  return urls
}

async function extractCourse(filePath) {
  const course = readCourse(filePath)
  const reviewsByUnit = new Map(course.reviews.map((r) => [r.unit, r]))

  const nodes = []
  const seenUnits = new Set()
  // Выложенные юнит-тесты держим своим множеством, а не пометкой на объекте
  // из read-course: чужой объект — не место для состояния этого прохода.
  const doneReviews = new Set()

  // Блок, не ставший заданием, — это потерянный кусок урока. Считаем такие по
  // причинам: без сводки в CLI формат data-correct у A1 (буквы вместо
  // индексов) молча выбросил 1222 задания и дожил до финального ревью.
  const dropped = new Map()
  const onDrop = (reason) => dropped.set(reason, (dropped.get(reason) || 0) + 1)

  for (const lesson of course.lessons) {
    // Юнит закрывается своим тестом: как только начался следующий юнит,
    // выкладываем тест предыдущего.
    if (!seenUnits.has(lesson.unit)) {
      for (const unit of seenUnits) {
        const review = reviewsByUnit.get(unit)
        if (review && !doneReviews.has(review)) {
          doneReviews.add(review)
          nodes.push(buildReviewNode({ review, level: course.level, stages: collectLesson(review.html, onDrop), onDrop }))
        }
      }
      seenUnits.add(lesson.unit)
    }
    const imageUrls = await writeImages(lesson, course.level)
    const cards = vocabCardsTask(lesson, (word) => imageUrls[word] || null)
    const lessonNodes = buildLessonNodes({ lesson, level: course.level, stages: collectLesson(lesson.html, onDrop), onDrop })
    if (cards) {
      const vocabNode = lessonNodes.find((n) => /vocab|words/i.test(n.title))
      if (vocabNode) {
        // Кикер карточек — кикер стадии словаря (с её номером): иначе первый
        // экран узла выглядит иначе, чем все следующие.
        const task = vocabNode.sec ? { ...cards, sec: vocabNode.sec } : cards
        // Ставим карточки ПОСЛЕ первой инструкции стадии, а не в самое начало.
        // Инструкции в разметке идут отдельными блоками перед своим
        // упражнением, и плеер подписывает ими следующий экран: стоя первыми,
        // карточки оставались без подписи, а их инструкция («Look and listen.
        // Tap a picture to hear the word») уезжала на соседнее упражнение.
        const at = vocabNode.tasks[0]?.type === 'info' ? 1 : 0
        vocabNode.tasks.splice(at, 0, task)
      }
      // Стадия Wrap закрывает урок самооценкой и возвратом слов: студент
      // отмечает, что теперь умеет, и может забрать слова урока в свой
      // словарь. Второй половины не было вовсе — слова оставались только на
      // стадии Vocabulary, в начале урока.
      const wrapNode = lessonNodes.find((n) => n.tasks.some((x) => /wrap/i.test(x.sec || '')))
      if (wrapNode) {
        const sec = wrapNode.tasks.find((x) => /wrap/i.test(x.sec || ''))?.sec
        wrapNode.tasks.push(sec ? { ...cards, sec } : cards)
      }

      // Без узла со словом "vocab"/"words" в заголовке карточки словаря
      // некуда врезать — раньше это молча проглатывалось. Если стадию
      // словаря в источнике переименуют, карточки тихо пропадут с тропы;
      // предупреждение в CLI делает такую потерю заметной сразу при генерации.
      if (!vocabNode) {
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
    if (!doneReviews.has(review)) {
      nodes.push(buildReviewNode({ review, level: course.level, stages: collectLesson(review.html, onDrop), onDrop }))
    }
  }

  const lessons = {}
  const catalog = []
  for (const node of nodes) {
    if (!node.tasks.length) continue
    attachNarration(node.tasks, course.level)
    const order = catalog.length
    lessons[node.code] = { code: node.code, title: node.title, tasks: node.tasks }
    catalog.push({ code: node.code, order, title: node.title, taskCount: node.tasks.length, type: lessonType(node.code, node.tasks), unit: node.unit })
  }

  return { level: course.level, label: course.label, lessons, catalog, dropped: Object.fromEntries(dropped) }
}

// Причины отбраковки блоков — человеческим языком для сводки в CLI.
const DROP_LABELS = {
  'choice-no-answer': 'choice без верного варианта (data-correct не совпал ни с одним data-val)',
  'select-answer-outside-options': 'select, ответ которого отсутствует среди вариантов',
  'gap-no-answer': 'пропуск без ответа в data-answer',
  'multi-no-answer': 'multi без разобранного набора верных вариантов',
  'order-too-short': 'order короче двух слов или с несовпадающими длинами списков',
  'order-not-permutation': 'order с рангами, не образующими перестановку (чужой или дублирующийся data-val)',
  'audio-no-track': 'аудио без файла в tracks урока',
  'info-empty': 'info без содержимого (в том числе опустевший после чистки мёртвых контролов курса)',
  'check-empty': 'чек-лист самооценки без единого пункта',
  'row-no-block': 'строка задания, в которой не нашлось ни одного интерактива',
  'unknown-kind': 'блок неизвестного вида',
}

/**
 * Сводка потерь по итогам уровня. Печатается через console.warn, как и
 * предупреждение о карточках словаря: молчаливая потеря контента — тот самый
 * дефект, из-за которого A1 уехал в ревью без единого задания choice.
 */
function warnDropped(level, dropped, lessons) {
  const total = Object.values(dropped).reduce((a, b) => a + b, 0)
  const nodes = Object.values(lessons)
  const graded = new Set(['choice', 'gap', 'chips', 'order', 'multi'])
  const silent = nodes.filter((n) => !n.tasks.some((t) => graded.has(t.type))).length

  console.log(`${level}: узлов без единого проверяемого задания — ${silent} из ${nodes.length}`)
  if (!total) {
    console.log(`${level}: блоков потеряно 0`)
    return
  }
  console.warn(`${level}: блоков не стало заданиями — ${total}:`)
  for (const [reason, count] of Object.entries(dropped).sort((a, b) => b[1] - a[1])) {
    console.warn(`  ${count} × ${DROP_LABELS[reason] || reason}`)
  }
}

function parseSources() {
  const out = []
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--src' && process.argv[i + 1]) out.push(process.argv[i + 1])
  }
  return out
}

async function run() {
  const sources = parseSources()
  if (!sources.length) {
    console.error('нужен хотя бы один --src <файл курса>')
    process.exit(1)
  }

  const indexPath = path.join(OUT, 'index.json')
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

  for (const src of sources) {
    const { level, label, lessons, catalog, dropped } = await extractCourse(src)
    fs.writeFileSync(path.join(OUT, `${level}.json`), JSON.stringify({ lessons }))

    index[level] = { lessons: catalog }
    const entry = { code: level, label, lessonCount: catalog.length }
    const at = index.levels.findIndex((l) => l.code === level)
    if (at >= 0) index.levels[at] = entry
    else index.levels.unshift(entry)

    const kb = (fs.statSync(path.join(OUT, `${level}.json`)).size / 1024) | 0
    console.log(`${level}: ${catalog.length} узлов → ${level}.json (${kb} KB)`)
    warnDropped(level, dropped, lessons)
  }

  index.levels.sort((a, b) => a.code.localeCompare(b.code))
  fs.writeFileSync(indexPath, JSON.stringify(index))
  console.log(`index.json: уровней ${index.levels.length}`)
}

if (require.main === module) run()

module.exports = { extractCourse }
