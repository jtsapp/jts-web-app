// Разбирает уроки перенесённого курса (public/course/<level>/lesson-N.json) на
// пошаговые задания для нового плеера — public/course/<level>/steps-N.json.
//
// Зачем: макет «Обучения» рисует урок как последовательность экранов (одно
// задание на экран, прогресс-бар и сердца сверху), а курс держит стадию целиком
// одной разметкой со своим движком. Разметку мы не выбрасываем — она остаётся
// источником: отсюда берутся вопросы, варианты и правильные ответы, а слова,
// картинки, слайды грамматики и аудио приходят из полей самого урока.
//
// Схема шага:
//   { stage, type, ... }
//   pick      { title, sub, options:[{emoji,label}] }        — без оценки
//   cards     { title, sub, words:[{en,ru,kk,def,img}] }      — без оценки
//   note      { title, html }                                 — без оценки
//   choice    { title, prompt, options:[…], answer }           — оценивается
//   listen    { title, track, options:[…], answer }             — оценивается
//   rows      { title, track, items:[{q,options,answer}] }       — оценивается
//   write     { title, sub, placeholder, model }               — самопроверка
//   checklist { title, sub, items:[…] }                        — без оценки
//
// Запуск: node scripts/build-course-steps.js [--level a2|b1]
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const LEVELS = ['a2', 'b1']

// --- работа с разметкой урока -------------------------------------------------
// Разметка курса ровная и предсказуемая, поэтому режем регулярками: DOM в node
// тянуть ради семи выборок незачем.
// Сущности раскрываем таблицей, а не цепочкой replace: список рос по одной
// штуке, и в шагах осталось 248 неразобранных «&ldquo;» — студент читал их
// прямо в вопросе («&ldquo;We meet up after work&rdquo;»).
const ENTITIES = {
  mdash: '—',
  ndash: '–',
  hellip: '…',
  middot: '·',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  rarr: '→',
  larr: '←',
  eacute: 'é',
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
}

const strip = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (m, n) => {
      const code = Number(n)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
    })
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()

// Вопросы к одной записи — на один экран. Дорожка в уроке одна на всю стадию,
// и по одному вопросу на экран студент слушал её заново на каждом: в B1 это
// пять экранов подряд на один и тот же трек.
//
// Границей служит инструкция: у одной записи бывает несколько разных заданий
// («Listen once. Who says…», «Listen again. True or false?», «The words they
// used…»). Склеить их под одним заголовком значило бы соврать про задание,
// поэтому серия рвётся там, где меняется title.
const ROWS_PER_SCREEN = 6

function listenScreens(tasks, track) {
  const out = []
  for (let i = 0; i < tasks.length; ) {
    const head = tasks[i]
    const run = []
    while (i < tasks.length && tasks[i].title === head.title) run.push(tasks[i++])
    // Один вопрос — обычный экран слушания: списком его рисовать незачем.
    if (run.length < 2) {
      out.push({ ...head, type: 'listen', track })
      continue
    }
    for (let from = 0; from < run.length; from += ROWS_PER_SCREEN) {
      out.push({
        stage: head.stage,
        type: 'rows',
        title: head.title,
        sub: head.sub || '',
        track,
        items: run.slice(from, from + ROWS_PER_SCREEN).map((t) => ({ q: t.prompt, options: t.options, answer: t.answer })),
      })
    }
  }
  return out
}

// Секция стадии из html урока: <section class="stage" data-stage="Vocabulary">…
function stageHtml(html, name) {
  const re = new RegExp(`<section[^>]*data-stage="${name}"[^>]*>([\\s\\S]*?)(?=<section[^>]*data-stage=|$)`)
  const m = re.exec(html)
  return m ? m[1] : ''
}
function stageNames(html) {
  return [...html.matchAll(/data-stage="([^"]+)"/g)].map((m) => m[1])
}

// Инструкция, ближайшая сверху к позиции задания, — это его заголовок.
function nearestInstruction(chunk, index) {
  const before = chunk.slice(0, index)
  const all = [...before.matchAll(/<div class="instruction"[^>]*>([\s\S]*?)<\/div>/g)]
  const last = all[all.length - 1]
  return last ? strip(last[1]).replace(/^\d+\s*·\s*/, '') : ''
}

// Задания с кнопками-вариантами: <div class="opts" data-correct="b">…<button
// class="opt" data-val="a">…
function optsTasks(chunk, stage, limit) {
  const out = []
  for (const m of chunk.matchAll(/<div class="opts"\s+data-correct="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g)) {
    const correct = m[1]
    const opts = [...m[2].matchAll(/<button class="opt"\s+data-val="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)]
    if (opts.length < 2) continue
    const answer = opts.find((o) => o[1] === correct)
    if (!answer) continue
    // Текст вопроса — тело строки до вариантов.
    const rowStart = chunk.lastIndexOf('<div class="row"', m.index)
    const prompt = strip(chunk.slice(rowStart, m.index).replace(/<span class="num">\d+<\/span>/, ''))
    out.push({
      stage,
      type: 'choice',
      title: nearestInstruction(chunk, rowStart >= 0 ? rowStart : m.index),
      prompt: prompt || '—',
      options: opts.map((o) => strip(o[2])),
      answer: strip(answer[2]),
    })
    if (out.length >= limit) break
  }
  return out
}

// Задания с выпадающим списком: <select data-answer="keep in touch">…
function selectTasks(chunk, stage, limit) {
  const out = []
  for (const m of chunk.matchAll(/<select\s+data-answer="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const answer = strip(m[1])
    const options = [...m[2].matchAll(/<option[^>]*>([\s\S]*?)<\/option>/g)]
      .map((o) => strip(o[1]))
      .filter((t) => t && t !== '—' && !/^choose/i.test(t) && t !== '&mdash;')
    if (options.length < 2 || !options.includes(answer)) continue
    const rowStart = chunk.lastIndexOf('<div class="row"', m.index)
    const rowEnd = chunk.indexOf('</div>', m.index + m[0].length)
    const row = chunk.slice(rowStart >= 0 ? rowStart : m.index, rowEnd > 0 ? rowEnd : m.index + m[0].length)
    const prompt = strip(row.replace(m[0], ' ____ ').replace(/<span class="num">\d+<\/span>/, ''))
    out.push({ stage, type: 'choice', title: nearestInstruction(chunk, rowStart >= 0 ? rowStart : m.index), prompt, options, answer })
    if (out.length >= limit) break
  }
  return out
}

// --- сборка шагов урока -------------------------------------------------------
function buildSteps(lesson) {
  const html = lesson.html || ''
  const steps = []
  const names = stageNames(html)

  // 1. Warm-up: выбор «что тебе ближе» — без правильного ответа.
  const warm = stageHtml(html, 'Warm-up')
  if (warm) {
    const opts = [...warm.matchAll(/<button class="opt"[^>]*>([\s\S]*?)<\/button>/g)].map((m) => strip(m[1])).filter(Boolean)
    if (opts.length >= 2) {
      const idx = warm.indexOf('<button class="opt"')
      steps.push({
        stage: 'Warm-up',
        type: 'pick',
        title: nearestInstruction(warm, idx) || 'Выбери, что тебе ближе',
        sub: 'Здесь нет правильного ответа',
        options: opts.slice(0, 10).map((label) => ({ label })),
      })
    }
  }

  // 2. Vocabulary: карточки слов урока (перевод по клику) и проверка перевода.
  const vocab = (lesson.VOCAB || []).filter((v) => Array.isArray(v) && v[0])
  if (vocab.length) {
    steps.push({
      stage: 'Vocabulary',
      type: 'cards',
      title: 'Слова урока',
      sub: 'Нажми на карточку, чтобы увидеть перевод',
      // Слова идут через strip, как и всё остальное: без него на карточке
      // печаталось «don&rsquo;t» и «It&rsquo;s a kind of&hellip;». Картинку при
      // этом ищем по СЫРОМУ ключу — в lesson.IMG слово лежит как в разметке.
      words: vocab.slice(0, 18).map(([en, pos, ru, kk, def]) => ({
        en: strip(en),
        pos: pos || '',
        ru: strip(ru),
        kk: strip(kk),
        def: strip(def),
        img: (lesson.IMG && lesson.IMG[en]) || null,
      })),
    })
    // Перевод: правильный вариант из слова, три отвлекающих — из соседних слов
    // того же урока (они одной темы, поэтому выбор не тривиальный).
    const ru = vocab.map((v) => v[2]).filter(Boolean)
    vocab.slice(0, 6).forEach(([en, , correct], i) => {
      if (!correct) return
      const others = ru.filter((x) => x !== correct)
      const picks = [correct, others[(i * 3) % others.length], others[(i * 3 + 1) % others.length], others[(i * 3 + 2) % others.length]]
      const options = [...new Set(picks)].filter(Boolean)
      if (options.length < 3) return
      steps.push({ stage: 'Vocabulary', type: 'choice', title: 'Выбери правильный перевод', prompt: en, options, answer: correct })
    })
  }

  // 3. Grammar: слайды правила, затем задания стадии.
  for (const slide of (lesson.SLIDES || []).slice(0, 3)) {
    steps.push({ stage: 'Grammar', type: 'note', title: 'Как это работает', html: slide })
  }
  const gram = stageHtml(html, 'Grammar')
  if (gram) steps.push(...optsTasks(gram, 'Grammar', 2), ...selectTasks(gram, 'Grammar', 2))

  // 4. Practice: основная масса проверяемых заданий урока.
  const prac = stageHtml(html, 'Practice')
  if (prac) steps.push(...selectTasks(prac, 'Practice', 4), ...optsTasks(prac, 'Practice', 4))

  // 5. Listening / Reading: аудио урока с вопросами стадии. Трек берём первый —
  // в уроке он один на всю стадию, а сегменты движок нарезал для своих кнопок.
  const listenStage = names.includes('Listening') ? 'Listening' : names.includes('Reading') ? 'Reading' : null
  if (listenStage) {
    const chunk = stageHtml(html, listenStage)
    const track = Object.values(lesson.tracks || {})[0] || null
    const tasks = [...optsTasks(chunk, 'Listening', 3), ...selectTasks(chunk, 'Listening', 2)]
    steps.push(...(track ? listenScreens(tasks, track) : tasks))
  }

  // 6. Now you: свободный ответ. Модель — из «полезного языка» стадии.
  const now = stageHtml(html, 'Now you')
  if (now) {
    const idx = now.indexOf('<div class="instruction"')
    const model = [...now.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1])).find(Boolean)
    steps.push({
      stage: 'Speaking',
      type: 'write',
      title: nearestInstruction(now + '<x>', now.length) || 'Скажи о себе',
      sub: 'Напиши ответ, затем проверь себя',
      placeholder: 'Твой ответ…',
      model: model || '',
      _idx: idx,
    })
  }

  // 7. Wrap: чек-лист «что я уже могу».
  const wrap = stageHtml(html, 'Wrap')
  if (wrap) {
    const items = [...wrap.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1])).filter((t) => t && t.length < 120)
    if (items.length) {
      steps.push({ stage: 'Wrap', type: 'checklist', title: 'Отметь, чему научился', sub: 'Я могу…', items: items.slice(0, 6) })
    }
  }

  return steps.map(({ _idx, ...s }) => s)
}

// Юнит-тест: та же разметка курса, но одной секцией и без стадий. Берём из неё
// все проверяемые задания — вопросы с вариантами и с выпадающим списком.
// Порог сдачи (pass/items) курс считает по своим 54 пунктам; у нас вопросов
// меньше, поэтому переводим порог в долю.
function buildTestSteps(test, unit) {
  const html = test.html || ''
  const steps = [...optsTasks(html, 'Unit Test', 40), ...selectTasks(html, 'Unit Test', 40)]
  const ratio = test.items ? Math.min(1, (test.pass || 0) / test.items) : 0.7
  return {
    unit,
    title: test.title || `Unit Test · Unit ${unit}`,
    passRatio: Math.round(ratio * 100) / 100,
    steps: steps.map((s) => ({ ...s, stage: 'Unit Test' })),
  }
}

function run() {
  const only = process.argv.includes('--level') ? process.argv[process.argv.indexOf('--level') + 1] : null
  for (const level of only ? [only] : LEVELS) {
    const dir = path.join(ROOT, 'public/course', level)
    if (!fs.existsSync(dir)) {
      console.warn(`${level}: нет public/course/${level} — пропуск`)
      continue
    }
    const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))
    const counts = {}
    let total = 0
    for (const l of index.lessons) {
      const lesson = JSON.parse(fs.readFileSync(path.join(dir, `lesson-${l.n}.json`), 'utf8'))
      const steps = buildSteps(lesson)
      fs.writeFileSync(path.join(dir, `steps-${l.n}.json`), JSON.stringify({ n: l.n, title: l.title, blurb: l.blurb, steps }))
      for (const s of steps) counts[s.type] = (counts[s.type] || 0) + 1
      total += steps.length
      if (steps.length < 6) console.warn(`  ! урок ${l.n} (${l.title}): всего ${steps.length} шагов`)
    }
    // Юнит-тесты уровня — по одному файлу на юнит.
    let tSteps = 0
    for (const t of index.tests || []) {
      const test = JSON.parse(fs.readFileSync(path.join(dir, `test-${t.unit}.json`), 'utf8'))
      const built = buildTestSteps(test, t.unit)
      fs.writeFileSync(path.join(dir, `steps-T${t.unit}.json`), JSON.stringify(built))
      tSteps += built.steps.length
      if (built.steps.length < 8) console.warn(`  ! тест юнита ${t.unit}: всего ${built.steps.length} вопросов`)
    }
    console.log(`  тесты: ${(index.tests || []).length} шт., ${tSteps} вопросов`)
    console.log(`${level}: ${index.lessons.length} уроков, ${total} шагов, в среднем ${(total / index.lessons.length).toFixed(1)} · ${JSON.stringify(counts)}`)
  }
}

if (require.main === module) run()

module.exports = { buildSteps, strip, stageHtml, listenScreens }
