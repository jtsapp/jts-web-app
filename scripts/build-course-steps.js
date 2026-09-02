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
//   watch     { title, sub, video }                            — без оценки (B2)
//   checklist { title, sub, items:[…] }                        — без оценки
//
// Запуск: node scripts/build-course-steps.js [--level b1|b2]
const fs = require('fs')
const path = require('path')
const { sayAudioFile, sayAudioUrl } = require('./jts-self/say-audio')

const ROOT = path.join(__dirname, '..')
// A0/A1/A2 ушли на курс нового поколения: их шаги собирает
// scripts/extract-selfstudy-course.js прямо из файла курса, а разметки уроков
// (lesson-<n>.json), из которой резал шаги этот скрипт, у них больше нет.
// Оставить их в списке значит уронить прогон на первом же уровне — или, хуже,
// переписать новые шаги огрызками старого курса.
const LEVELS = ['b1', 'b2']

// Запись слова, если она уже сгенерирована (scripts/make-lesson-audio.js).
// Имя файла — хэш самого слова, поэтому привязка переживает пересборку шагов:
// порядок уроков и заданий на неё не влияет. Записи нет — карточка читает
// слово синтезом браузера, как и раньше.
const AUDIO_ROOT = path.join(ROOT, 'public/learning/audio')
function wordAudio(level, word) {
  if (!level || !word) return null
  return fs.existsSync(path.join(AUDIO_ROOT, level, sayAudioFile(word))) ? sayAudioUrl(level, word) : null
}

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
function buildSteps(lesson, level) {
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
        ...(wordAudio(level, strip(en)) ? { audio: wordAudio(level, strip(en)) } : {}),
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

// --- уроки нового поколения (B2) ---------------------------------------------
// B2 собран другим генератором, и совпадений с A0–B1 у него мало: стадий семь
// (Production вместо «Now you», Quiz с двадцатью готовыми вопросами, у половины
// уроков Reading вместо Listening), слайдов и полей QS/SLIDES/CTX нет вовсе —
// всё живёт в разметке, а перевода слов нет ни на русский, ни на казахский:
// вместо него английское определение. Поэтому у уровня свой сборщик; общими
// остаются разборщики заданий (optsTasks/selectTasks) и strip.

// Курс держит три режима в одной разметке и прячет чужие правилом
// [data-only]{display:none}. Сайт играет только self, и в шаги обязано попасть
// ровно то, что видит студент-самоучка: у B2 в group/solo-блоках лежат задания
// для работы с преподавателем («Read your card. Do not show it to your
// partner»), а объяснение грамматики целиком — наоборот, только в self.
function selfOnly(html) {
  let out = ''
  let rest = String(html || '')
  for (;;) {
    const m = /<([a-z0-9]+)([^>]*?)\sdata-only="([^"]*)"([^>]*)>/i.exec(rest)
    if (!m) return out + rest
    out += rest.slice(0, m.index)
    const tag = m[1].toLowerCase()
    const open = m.index + m[0].length
    // Парный закрывающий тег с учётом вложенных одноимённых.
    const re = new RegExp(`<(/?)${tag}\\b`, 'gi')
    re.lastIndex = open
    let depth = 1
    let mm
    while ((mm = re.exec(rest))) {
      depth += mm[1] ? -1 : 1
      if (depth === 0) break
      re.lastIndex = mm.index + mm[0].length
    }
    const close = mm ? rest.indexOf('>', mm.index) + 1 : rest.length
    if (m[3].split(/\s+/).includes('self')) out += rest.slice(m.index, close)
    rest = rest.slice(close)
  }
}

// Открытое задание («выбери, что тебе ближе») — блок .opentask со своими
// кнопками. Один экран на блок: в разминке B2 их три подряд про разное, и
// склеить их кнопки в один список значило бы соврать про задание.
function openPicks(chunk, stage, limit) {
  const out = []
  for (const m of chunk.matchAll(/<div class="opentask"[^>]*>([\s\S]*?)(?=<div class="opentask"|<div class="writebox"|<\/section>|$)/g)) {
    let opts = [...m[1].matchAll(/<button class="opt"[^>]*>([\s\S]*?)<\/button>/g)].map((o) => strip(o[1])).filter(Boolean)
    if (opts.length < 2) continue
    // Часть заданий нумерует варианты буквами, а сами варианты держит строками
    // выше («A — You are ten minutes into a meeting…»). Кнопки «A B C D» на
    // экране шага бессмысленны: строки на него не попадают.
    if (opts.every((o) => o.length <= 2)) {
      const rows = [...m[1].matchAll(/<span class="body">([\s\S]*?)<\/span>/g)]
        // Последняя строка блока держит сами кнопки и подсказку — вариантом
        // она не является («A B C D Choose one and write two sentences…»).
        .filter((r) => !/class="(?:opt|ohint)"/.test(r[1]))
        .map((r) => strip(r[1]))
        .filter((t) => t && t.length > 2)
      if (rows.length < 2) continue
      opts = rows
    }
    out.push({
      stage,
      type: 'pick',
      title: nearestInstruction(chunk, m.index) || 'Выбери, что тебе ближе',
      sub: 'Здесь нет правильного ответа',
      options: opts.slice(0, 8).map((label) => ({ label })),
    })
    if (out.length >= limit) break
  }
  return out
}

// Задания идут в разметке разделами; ровно по кругу разделов — значит, экран
// не будет шесть раз подряд про одно и то же.
function roundRobin(tasks, limit) {
  const groups = new Map()
  for (const t of tasks) {
    const key = t.title || ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(t)
  }
  const lists = [...groups.values()]
  const out = []
  for (let i = 0; out.length < limit && lists.some((l) => l.length > i); i++) {
    for (const l of lists) {
      if (l[i] && out.length < limit) out.push(l[i])
    }
  }
  return out
}

// Объяснение правила: .bubble с подписью .blab. У B2 это связный текст на
// два-три абзаца — он и есть «как это работает» для самоучки.
function bubbleNotes(chunk, limit) {
  const out = []
  for (const m of chunk.matchAll(/<div class="bubble[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="(?:instruction|bubble|task|opentask|writebox)|<table|<\/section>|$)/g)) {
    const body = m[1]
    const lab = /<div class="blab">([\s\S]*?)<\/div>/.exec(body)
    const html = body.replace(/<div class="blab">[\s\S]*?<\/div>/, '').trim()
    if (strip(html).length < 120) continue
    out.push({ stage: 'Grammar', type: 'note', title: strip(lab ? lab[1] : '') || 'Как это работает', html })
    if (out.length >= limit) break
  }
  return out
}

// Текст для чтения: у уроков с Reading вход — не запись, а два текста по 300
// слов. Без них вопросы стадии неразрешимы, поэтому текст едет отдельным
// экраном перед ними.
function readNotes(chunk, limit) {
  const out = []
  for (const m of chunk.matchAll(/<div class="rtext">([\s\S]*?)<\/div>\s*(?=<div class="(?:instruction|task|opentask|rtext|writebox)|<\/section>|$)/g)) {
    const body = m[1]
    const h = /<h4>([\s\S]*?)<\/h4>/.exec(body)
    if (strip(body).length < 200) continue
    out.push({
      stage: 'Reading',
      type: 'note',
      title: strip(h ? h[1] : '') || 'Прочитай текст',
      html: body.replace(/<h4>[\s\S]*?<\/h4>/, '').trim(),
    })
    if (out.length >= limit) break
  }
  return out
}

// Вопросы к тексту — то же самое, что и к записи, но без плеера: пять строк
// одного задания («Which text does each statement describe?») пятью экранами
// подряд читаются как заедание, а списком это одно задание и есть.
function readScreens(tasks) {
  const out = []
  for (let i = 0; i < tasks.length; ) {
    const head = tasks[i]
    const run = []
    while (i < tasks.length && tasks[i].title === head.title) run.push(tasks[i++])
    if (run.length < 2) {
      out.push(head)
      continue
    }
    for (let from = 0; from < run.length; from += ROWS_PER_SCREEN) {
      out.push({
        stage: head.stage,
        type: 'rows',
        title: head.title,
        sub: head.sub || '',
        items: run.slice(from, from + ROWS_PER_SCREEN).map((t) => ({ q: t.prompt, options: t.options, answer: t.answer })),
      })
    }
  }
  return out
}

// Ключ дорожки и видео разметка держит коротким именем (data-track="a11",
// <source data-src="v1">), а файл к нему подобрал экстрактор.
const trackOf = (chunk, lesson) => {
  const m = /data-track="([^"]+)"/.exec(chunk)
  return (m && (lesson.tracks || {})[m[1]]) || null
}
// Видео-репортаж юнита стоит в последнем уроке юнита, но не всегда в одной и
// той же стадии: до 24-го урока — в Production, дальше — во входной стадии.
// Поэтому экран «посмотри» собирается там, где видео нашлось, а не там, где
// его ожидали.
function watchSteps(chunk, lesson, stage) {
  const m = /<source[^>]*data-src="([^"]+)"/.exec(chunk)
  const video = m && (lesson.videos || {})[m[1]]
  if (!video) return []
  return [
    {
      stage,
      type: 'watch',
      title: nearestInstruction(chunk, chunk.indexOf('<video')) || 'Посмотри видео',
      sub: 'Смотри и слушай — задания дальше',
      video,
    },
  ]
}

// Карточки слов и проверка. Перевода в источнике нет вовсе, поэтому карточка
// живёт английским определением, и проверка тоже: «слово ↔ определение».
// Отвлекающие — определения соседних слов урока: они из одной темы, так что
// выбор не сводится к «какое предложение вообще про это».
function vocabStepsNext(lesson, level) {
  const rows = (lesson.VOCAB || []).filter((r) => Array.isArray(r) && r[0])
  if (!rows.length) return []
  const steps = [
    {
      stage: 'Vocabulary',
      type: 'cards',
      title: 'Слова урока',
      sub: 'Нажми на карточку, чтобы увидеть значение',
      words: rows.slice(0, 18).map(([en, pos, ipa, def, , , , img]) => ({
        en: strip(en),
        pos: pos || '',
        ipa: ipa || '',
        def: strip(def),
        img: typeof img === 'string' && img.startsWith('/') ? img : null,
        // Поле только при живой записи: иначе у уровней без озвучки каждое
        // слово в шагах обрастает "audio":null и файл растёт на пустом месте.
        ...(wordAudio(level, strip(en)) ? { audio: wordAudio(level, strip(en)) } : {}),
      })),
    },
  ]
  const defs = rows.map((r) => strip(r[3])).filter(Boolean)
  rows.slice(0, 4).forEach(([en, , , rawDef], i) => {
    const answer = strip(rawDef)
    if (!answer) return
    const others = defs.filter((d) => d !== answer)
    const options = [...new Set([answer, ...Array.from({ length: MAX_CHOICES - 2 }, (_, k) => others[(i * 3 + k) % others.length])])].filter(Boolean)
    if (options.length < 3) return
    steps.push({ stage: 'Vocabulary', type: 'choice', title: 'Выбери значение слова', prompt: strip(en), options, answer })
  })
  return steps
}

function buildStepsNext(lesson, level) {
  const html = selfOnly(lesson.html || '')
  const names = stageNames(html)
  const steps = []

  const warm = stageHtml(html, 'Warm-up')
  if (warm) steps.push(...openPicks(warm, 'Warm-up', 2))

  steps.push(...vocabStepsNext(lesson, level))
  const vocab = stageHtml(html, 'Vocabulary')
  if (vocab) steps.push(...selectTasks(vocab, 'Vocabulary', 2))

  const gram = stageHtml(html, 'Grammar')
  if (gram) steps.push(...bubbleNotes(gram, 2), ...selectTasks(gram, 'Grammar', 2), ...optsTasks(gram, 'Grammar', 1))

  // Вход стадии: у половины уроков запись, у другой половины — два текста.
  const inputStage = names.includes('Listening') ? 'Listening' : 'Reading'
  const input = stageHtml(html, inputStage)
  if (input) {
    const tasks = [...optsTasks(input, inputStage, 2), ...selectTasks(input, inputStage, 5)]
    steps.push(...watchSteps(input, lesson, inputStage))
    if (inputStage === 'Listening') {
      const track = trackOf(input, lesson)
      steps.push(...(track ? listenScreens(tasks, track) : tasks))
    } else {
      steps.push(...readNotes(input, 2), ...readScreens(tasks))
    }
  }

  const prod = stageHtml(html, 'Production')
  if (prod) {
    steps.push(...watchSteps(prod, lesson, 'Production'))
    steps.push(...selectTasks(prod, 'Production', 1))
    // Образец — письмо целиком, с абзацами: плоским текстом оно склеится.
    const model = /<div class="bubble cy"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="(?:instruction|task|writebox)|<\/section>|$)/.exec(prod)
    steps.push({
      stage: 'Production',
      type: 'write',
      title: 'Напиши свой текст',
      sub: 'Напиши ответ, затем сверься с образцом',
      placeholder: 'Твой ответ…',
      modelHtml: model ? model[1].replace(/<div class="blab">[\s\S]*?<\/div>/, '').trim() : '',
    })
  }

  // Квиз урока — двадцать готовых вопросов тремя разделами (лексика,
  // грамматика, функция). Подряд они дали бы шесть вопросов одной лексики,
  // поэтому берём по кругу разделов. Счётчик «questions 1–7» из заголовка
  // убираем: на экране шага он ссылается на нумерацию, которой там нет.
  const quiz = stageHtml(html, 'Quiz').replace(/<span class="qcount">[\s\S]*?<\/span>/g, '')
  if (quiz) steps.push(...roundRobin(selectTasks(quiz, 'Quiz', 40), 6))

  // Чек-лист «что я уже могу»: у B2 пункты — кнопки .opt, а не <li>.
  const wrap = stageHtml(html, 'Wrap')
  if (wrap) {
    const items = [...wrap.matchAll(/<button class="opt"[^>]*>([\s\S]*?)<\/button>/g)].map((m) => strip(m[1])).filter(Boolean)
    if (items.length) steps.push({ stage: 'Wrap', type: 'checklist', title: 'Отметь, чему научился', sub: 'Я могу…', items: items.slice(0, 6) })
  }

  return dedupe(steps).map(({ _idx, ...s }) => s)
}

// Большой тест уровня: у B2 их четыре (после юнитов 3, 6, 9 и 12), и вопросы
// приходят не разметкой, а банком — {l:урок, c:область, q, a, d:[неверные]}.
// Оригинал набирает сорок вопросов случайно на каждую попытку; шаги у нас
// статичные, поэтому берём детерминированно и ровным слоем: по кругу областям
// (лексика/грамматика/функция) и по возрастанию урока.
const EXAM_AREA = { v: 'Vocabulary', g: 'Grammar', f: 'Function' }

function buildExamSteps(exam, want) {
  const byArea = new Map()
  for (const q of exam.bank || []) {
    if (!q || !q.q || !q.a) continue
    if (!byArea.has(q.c)) byArea.set(q.c, [])
    byArea.get(q.c).push(q)
  }
  for (const list of byArea.values()) list.sort((a, b) => (a.l || 0) - (b.l || 0))
  const areas = [...byArea.keys()]
  const picked = []
  for (let round = 0; picked.length < want && areas.some((a) => byArea.get(a).length > round); round++) {
    for (const a of areas) {
      const q = byArea.get(a)[round]
      if (q && picked.length < want) picked.push(q)
    }
  }
  const steps = picked.map((q, i) => {
    const wrong = (q.d || []).map(strip).filter(Boolean)
    const answer = strip(q.a)
    // Верный ответ не должен всегда стоять первым: место двигаем по номеру
    // вопроса, порядок при этом остаётся одинаковым от сборки к сборке.
    const options = [...wrong]
    options.splice(i % (options.length + 1), 0, answer)
    return {
      stage: 'Test',
      type: 'choice',
      title: EXAM_AREA[q.c] || 'Test',
      prompt: strip(q.q),
      options,
      answer,
    }
  })
  return {
    id: exam.id,
    title: strip(exam.title || exam.label || ''),
    passRatio: exam.items ? Math.round(Math.min(1, (exam.pass || 0) / exam.items) * 100) / 100 : 0.7,
    steps,
  }
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
      // Поколение урока видно по нему самому: у нового (B2) есть список
      // заданий tids и нет ни SLIDES, ни QS — всё в разметке.
      const steps = lesson.tids ? buildStepsNext(lesson, level) : buildSteps(lesson, level)
      fs.writeFileSync(path.join(dir, `steps-${l.n}.json`), JSON.stringify({ n: l.n, title: l.title, blurb: l.blurb, steps }))
      for (const s of steps) counts[s.type] = (counts[s.type] || 0) + 1
      total += steps.length
      if (steps.length < 6) console.warn(`  ! урок ${l.n} (${l.title}): всего ${steps.length} шагов`)
    }
    // Тесты уровня: у A0–B1 по одному на юнит (test-<u>.json), у B2 — четыре
    // больших с банком вопросов (exam-<id>.json), они и лежат в каталоге с id.
    let tSteps = 0
    for (const t of index.tests || []) {
      if (t.id) {
        const exam = JSON.parse(fs.readFileSync(path.join(dir, `exam-${t.id}.json`), 'utf8'))
        const built = buildExamSteps({ ...exam, items: t.items, pass: t.pass }, t.items || 40)
        fs.writeFileSync(path.join(dir, `steps-X${t.id}.json`), JSON.stringify(built))
        tSteps += built.steps.length
        if (built.steps.length < 20) console.warn(`  ! тест ${t.id}: всего ${built.steps.length} вопросов`)
        continue
      }
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

module.exports = { buildSteps, buildStepsNext, buildExamSteps, selfOnly, wordAudio, strip, stageHtml, listenScreens }
