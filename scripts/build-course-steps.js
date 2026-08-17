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
const LEVELS = ['a0', 'a1', 'a2', 'b1']

// Один верный и четыре неверных на экране выбора — как в макете «Обучения».
const MAX_CHOICES = 5

// Слова урока. У A2/B1 VOCAB — плоский массив, у A0/A1 — объект с режимами
// { self, group, solo }: сайт играет только self (см. режим курса в
// scripts/extract-course-lessons.js), из него и берём. Без этой развилки у
// A0/A1 не собиралось ни карточек слов, ни вопросов на перевод.
function vocabRows(lesson) {
  const v = lesson.VOCAB
  const rows = Array.isArray(v) ? v : (v && (v.self || v.group || v.solo)) || []
  return rows.filter((r) => Array.isArray(r) && r[0])
}

// Стадии в уроках курса называются по-разному: у A0/A2/B1 это Warm-up /
// Practice / Listening, у A1 — Intro, Recall, Firsts, Type it, Listen, Done.
// Без словаря половина стадий A1 не находилась, и урок собирался из огрызков.
const STAGE_ALIASES = {
  warm: ['Warm-up', 'Intro'],
  practice: ['Practice', 'Recall', 'Type it', 'Firsts'],
  listen: ['Listening', 'Reading', 'Listen'],
  speak: ['Now you', 'Speaking', 'Write'],
  wrap: ['Wrap', 'Done'],
}
const stageOneOf = (names, key) => STAGE_ALIASES[key].find((n) => names.includes(n)) || null
const stagesOf = (names, key) => STAGE_ALIASES[key].filter((n) => names.includes(n))

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

// Строка задания бывает пустой: у части упражнений весь вопрос стоит в
// инструкции стадии, а сама строка держит только варианты. Раньше на её место
// подставлялось тире, и на экране крупным фиолетовым светилось «—», а вопрос
// читался мелким серым сверху (99 экранов A2/B1). Пустой вопрос отдаём
// инструкции: она и есть вопрос, ей и быть крупной строкой.
function questionOf(prompt, instruction) {
  const clean = String(prompt || '').trim()
  const meaningful = /[a-zA-Zа-яА-Я0-9]/.test(clean)
  return meaningful ? { title: instruction, prompt: clean } : { title: '', prompt: instruction }
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
      ...questionOf(prompt, nearestInstruction(chunk, rowStart >= 0 ? rowStart : m.index)),
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
    out.push({
      stage,
      type: 'choice',
      ...questionOf(prompt, nearestInstruction(chunk, rowStart >= 0 ? rowStart : m.index)),
      options,
      answer,
    })
    if (out.length >= limit) break
  }
  return out
}

// Слайд правила приходит двумя видами: у A0/A2/B1 это готовая разметка строкой
// («<p class="s-en">☕ <b>I like coffee.</b></p>»), а у A1 — пара
// [эмодзи, предложение]: экстрактор того уровня уложил слайды так.
// Массив уезжал в шаг как есть и на экране превращался в голую склеенную фразу
// без разметки — тот самый экран «цель есть, а задания нет» (28 шагов A1).
function slideHtml(slide) {
  if (typeof slide === 'string') return slide.trim()
  if (!Array.isArray(slide)) return ''
  const parts = slide.map((x) => strip(String(x || ''))).filter(Boolean)
  if (!parts.length) return ''
  // Эмодзи в паре стоит первым и отдельным элементом — собираем ту же строку,
  // что и у остальных уровней, чтобы стиль слайда был один на весь курс.
  const [first, ...rest] = parts
  const isEmoji = rest.length > 0 && !/[a-zA-Zа-яА-Я0-9]/.test(first)
  return isEmoji
    ? `<p class="s-en">${first} <b>${rest.join(' ')}</b></p>`
    : `<p class="s-en"><b>${parts.join(' ')}</b></p>`
}

// --- сборка шагов урока -------------------------------------------------------
function buildSteps(lesson) {
  const html = lesson.html || ''
  const steps = []
  const names = stageNames(html)

  // 1. Warm-up: выбор «что тебе ближе» — без правильного ответа.
  const warm = stageHtml(html, stageOneOf(names, 'warm') || 'Warm-up')
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
  const vocab = vocabRows(lesson)
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
    // Перевод: правильный вариант из слова, четыре отвлекающих — из соседних
    // слов того же урока (они одной темы, поэтому выбор не тривиальный).
    // Уже отгаданный перевод в следующих словах отвлекающим не появляется:
    // в оригинале это одна таблица сопоставления, где занятая пара выбывает.
    const ru = vocab.map((v) => strip(v[2])).filter(Boolean)
    const kkOf = new Map(vocab.filter((v) => v[2]).map((v) => [strip(v[2]), strip(v[3] || '')]))
    const used = new Set()
    vocab.slice(0, 6).forEach(([en, , rawCorrect], i) => {
      const correct = strip(rawCorrect)
      if (!correct) return
      const others = ru.filter((x) => x !== correct && !used.has(x))
      const picks = [correct]
      for (let k = 0; k < MAX_CHOICES - 1 && others.length; k++) picks.push(others[(i * (MAX_CHOICES - 1) + k) % others.length])
      const options = [...new Set(picks)].filter(Boolean)
      if (options.length < 3) return
      used.add(correct)
      // Казахская сторона едет рядом отдельным полем: склеивать «ru · kk» в
      // одну строку нельзя — при русском интерфейсе это каша (см.
      // src/learning/bilingual.js), а на этапе сборки языка мы не знаем.
      const kk = options.map((o) => kkOf.get(o) || '')
      steps.push({
        stage: 'Vocabulary',
        type: 'choice',
        title: 'Выбери правильный перевод',
        prompt: strip(en),
        options,
        answer: correct,
        ...(kk.every(Boolean) ? { optionsKk: kk, answerKk: kkOf.get(correct) || '' } : {}),
      })
    })
  }

  // 3. Grammar: слайды правила, затем задания стадии.
  for (const slide of (lesson.SLIDES || []).slice(0, 3)) {
    const slideMarkup = slideHtml(slide)
    // Экран ради двух слов не нужен: «Oh no!», «📗 one book» — это обрывки
    // реплики из примера, а не правило. Порог 15 знаков: короче реального
    // предложения на этих уровнях не бывает.
    if (strip(slideMarkup).length >= 15) {
      steps.push({ stage: 'Grammar', type: 'note', title: 'Как это работает', html: slideMarkup })
    }
  }
  const gram = stageHtml(html, 'Grammar')
  if (gram) steps.push(...optsTasks(gram, 'Grammar', 2), ...selectTasks(gram, 'Grammar', 2))

  // 4. Practice: основная масса проверяемых заданий урока. У A1 практика
  // разнесена по нескольким стадиям (Recall, Firsts, Type it) — берём все.
  for (const name of stagesOf(names, 'practice')) {
    const prac = stageHtml(html, name)
    if (prac) steps.push(...selectTasks(prac, 'Practice', 4), ...optsTasks(prac, 'Practice', 4))
  }

  // 5. Listening / Reading: аудио урока с вопросами стадии. Трек берём первый —
  // в уроке он один на всю стадию, а сегменты движок нарезал для своих кнопок.
  const listenStage = stageOneOf(names, 'listen')
  if (listenStage) {
    const chunk = stageHtml(html, listenStage)
    const track = Object.values(lesson.tracks || {})[0] || null
    const tasks = [...optsTasks(chunk, 'Listening', 3), ...selectTasks(chunk, 'Listening', 2)]
    steps.push(...(track ? listenScreens(tasks, track) : tasks))
  }

  // 6. Now you: свободный ответ. Модель — из «полезного языка» стадии.
  const now = stageHtml(html, stageOneOf(names, 'speak') || 'Now you')
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
  const wrap = stageHtml(html, stageOneOf(names, 'wrap') || 'Wrap')
  if (wrap) {
    const items = [...wrap.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1])).filter((t) => t && t.length < 120)
    if (items.length) {
      steps.push({ stage: 'Wrap', type: 'checklist', title: 'Отметь, чему научился', sub: 'Я могу…', items: items.slice(0, 6) })
    }
  }

  return dedupe(steps).map(({ _idx, ...s }) => s)
}

// Одну и ту же строку урока ловят оба разборщика — и кнопки-варианты, и
// выпадающий список, — поэтому вопрос приезжал на экран дважды подряд
// («I get up ___ the morning.» два раза в одном уроке). Совпадение считаем по
// вопросу и ответу: одинаковый вопрос с РАЗНЫМ ответом — это разные задания.
function dedupe(steps) {
  const seen = new Set()
  return steps.filter((s) => {
    if (!s.prompt) return true
    const key = `${s.type}|${normKey(s.prompt)}|${normKey(s.answer)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
const normKey = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

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
