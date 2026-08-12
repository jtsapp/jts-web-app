// Уроки A0/A1 (public/learning/<level>.json) в шаги пошагового плеера.
//
// Эти уровни и так хранят урок как список заданий — по одному на экран, ровно
// как рисует макет, поэтому конвертация идёт в рантайме и не требует
// генерировать сотни файлов: 151 урок A0 и 287 A1 превратились бы в 438 JSON
// ради переименования полей.
//
// Типы заданий уровня → типы шагов:
//   choice → choice     gap  → gap      order → order
//   listen → listen     info → note     check → checklist    multi → pick

// Уровни, чей контент лежит в новом формате и играется пошаговым плеером.
// B2/C1 остаются на старом плеере: у них другой набор типов (chips, watch).
export const STEP_LEVELS = ['a0', 'a1']

export function isStepLevel(level) {
  return STEP_LEVELS.includes(String(level || '').toLowerCase())
}

// «1. Warm-up» → «Warm-up»: номер секции в шапке не нужен, там и так виден
// прогресс.
function stageOf(task) {
  const sec = String(task.sec || '').trim()
  return sec.replace(/^\d+\.\s*/, '') || 'Урок'
}

// «☕ coffee» → { emoji: '☕', label: 'coffee' }. Эмодзи в макете живёт отдельной
// строкой над подписью, поэтому его надо отделить, а не печатать в тексте.
const EMOJI = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*(.*)$/u

function splitEmoji(item) {
  const m = EMOJI.exec(String(item || '').trim())
  return m ? { emoji: m[1], label: m[2] } : { label: String(item || '') }
}

const textOf = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Вынимает <div class="<cls>">…</div> из разметки, считая вложенность: внутри
// такого блока свои <div>, и нежадный регексп обрезал бы его по первому же
// закрывающему тегу, оставляя хвост чужой разметки на экране.
// Возвращает остаток и внутренности вынутых блоков.
function extractBlocks(html, cls) {
  const open = new RegExp(`<div[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`, 'i')
  let rest = String(html || '')
  const blocks = []
  for (;;) {
    const m = open.exec(rest)
    if (!m) return { rest, blocks }
    const from = m.index + m[0].length
    let depth = 1
    const tag = /<div\b|<\/div>/gi
    tag.lastIndex = from
    let inner = rest.length
    let end = rest.length
    for (let hit = tag.exec(rest); hit; hit = tag.exec(rest)) {
      depth += hit[0][1] === '/' ? -1 : 1
      if (depth === 0) {
        inner = hit.index
        end = hit.index + hit[0].length
        break
      }
    }
    blocks.push(rest.slice(from, inner))
    rest = rest.slice(0, m.index) + rest.slice(end)
  }
}

// Мета-комментарий методологов: блок .player называет ИСТОЧНИК записи
// («🔊 Free time — Oxford Navigate audio», «Original coursebook recording»).
// Он писался, пока курс собирали с методологами, и студенту не нужен: сам
// плеер дорожки приезжает отдельным заданием listen, а на экране от этого
// блока остаётся только имя чужого учебника. 24 таких блока в A0, 122 в A1.
const stripSourceCredit = (html) => extractBlocks(html, 'player').rest

// Открытое задание на письмо: <div class="opentask">, внутри — инструкция и
// образец ответа в .bubble.am («Model answer … Check yourself»). Курс держал
// образец закрытым, пока студент не написал своё; печатаясь заметкой, он
// показывал ответ сразу — писать после этого нечего. В плеере под это есть
// свой тип шага (write): поле ввода, а образец открывается кнопкой.
// Стадия Wrap исходного курса: студент отмечает, что теперь умеет, и может
// забрать слова урока в свой словарь. В разметке она приезжает одним блоком, а
// сверху в нём — карточка «🎉 Lesson complete! ⭐ 60 points», которая у нас
// дублирует собственный экран итогов плеера (там и очки, и сердца). Её убираем,
// а список <ul class="can"> становится чек-листом, как в макете.
const CAN_LIST = /<ul[^>]*class="[^"]*\bcan\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/i

function canItemsOf(html) {
  const m = CAN_LIST.exec(html)
  if (!m) return null
  const items = [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    // Галочка в начале пункта — украшение разметки, а не текст пункта: в
    // чек-листе плеера своя отметка, и «✓ say what I like» читалось бы как
    // «уже отмечено».
    .map((li) => textOf(li[1].replace(/<span[^>]*class="[^"]*\btick\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')))
    .filter(Boolean)
  return items.length ? { items, rest: html.replace(m[0], '') } : null
}

function writeStepFrom(inner, stage) {
  const { rest, blocks } = extractBlocks(inner, 'bubble')
  const instruction = /<div[^>]*class="[^"]*\binstruction\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(rest)
  return {
    stage,
    type: 'write',
    title: instruction ? textOf(instruction[1]) : '',
    sub: '',
    // Образец — размеченный (в нём список «Check yourself»), плоский текст
    // склеил бы его в одну строку.
    modelHtml: blocks.length ? blocks.join('') : '',
    model: blocks.length ? textOf(blocks.join('')) : '',
  }
}

// Скрипт записи: <details class="gref"><summary>What you heard</summary>.
// В исходном курсе действовало правило — скрипт не виден, пока задания стадии
// не сделаны. По одному заданию на экран он оказывался ПЕРЕД ними: студент
// открывал спойлер и списывал ответы. Отличаем его от справочника грамматики
// (тот же класс gref) по заголовку спойлера.
const TRANSCRIPT_SUMMARY = /what you heard|audioscript|transcript|script/i

function splitTranscript(html) {
  const s = String(html || '')
  const found = []
  for (const m of s.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)) {
    const summary = /<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(m[1])
    if (summary && TRANSCRIPT_SUMMARY.test(textOf(summary[1]))) found.push(m[0])
  }
  if (!found.length) return { rest: s, transcript: '' }
  let rest = s
  for (const block of found) rest = rest.replace(block, '')
  return { rest, transcript: found.join('') }
}

// Подпись задания в разметке урока: инструкция и строка под ней. В исходном
// курсе они лежат ОТДЕЛЬНЫМ блоком перед самим упражнением — на странице это
// читалось как заголовок, а по одному заданию на экран превращалось в пустой
// экран с двумя строчками (реальный баг: «Tick the ones you like» без самих
// вариантов). Поэтому такие блоки не становятся шагом, а подписывают следующий.
const LEAD = /<(div|p)[^>]*class="(?:instruction|subline|byline)"[^>]*>([\s\S]*?)<\/\1>/gi

function leadOf(html) {
  const parts = []
  let rest = String(html || '')
  for (const m of rest.matchAll(LEAD)) parts.push(textOf(m[2]))
  rest = rest.replace(LEAD, ' ')
  // Осталось что-то кроме подписи — это полноценная заметка, не подпись.
  if (!parts.length || textOf(rest) || /<(img|audio|table|ul|ol|details)\b/i.test(rest)) return null
  return { title: parts[0] || '', sub: parts.slice(1).join(' ') }
}

// Соединение пар («Match the word to the picture») в источнике — одно
// упражнение: слева слова, справа переводы, и использованный вариант из правой
// колонки уходит. Экстрактор разворачивает его в отдельные choice — по одному
// на слово, и каждый несёт ВЕСЬ набор переводов. На экране это превращалось в
// десять подряд вопросов «выбери 1 из 10» вместо одного соединения, а при трёх
// сердцах гарантированно валило урок.
//
// Опознаём по данным, а не по тексту инструкции: подряд идущие choice одной
// стадии с ОДИНАКОВЫМ набором вариантов и разными ответами — это и есть одно
// соединение. Двух пар мало (это честно два вопроса), с трёх — уже упражнение.
const MIN_MATCH_PAIRS = 3

const sameBank = (a, b) =>
  a && b && a.type === 'choice' && b.type === 'choice' && a.sec === b.sec && JSON.stringify(a.options) === JSON.stringify(b.options)

function matchRunAt(tasks, start) {
  const first = tasks[start]
  if (first.type !== 'choice' || !Array.isArray(first.options) || first.options.length < MIN_MATCH_PAIRS) return 0
  // Серия обязана начинаться с начала блока: иначе, наткнувшись на повтор
  // ответа, детектор просто съезжал на шаг вправо и собирал соединение из
  // хвоста того же блока — то есть из вопросов, которые парами не являются.
  if (sameBank(tasks[start - 1], first)) return 0

  const answers = new Set()
  let end = start
  while (end < tasks.length && sameBank(tasks[end], first)) {
    const t = tasks[end]
    // Повтор ответа (или пункт без своего вопроса) означает, что это не пары,
    // а несколько вопросов с общим банком вариантов — весь блок не соединение.
    if (!t.answer || !t.word || answers.has(t.answer)) return 0
    answers.add(t.answer)
    end++
  }
  return end - start >= MIN_MATCH_PAIRS ? end - start : 0
}

// Несколько заданий на одном экране — там, где это влезает на телефон.
//
// Исходный курс строился по экранам: всё, что было на одном экране, там и
// оставалось. Разложив урок строго по одному заданию, мы получили длинные
// хвосты однотипных вопросов и разорванные упражнения. Склеиваем обратно
// только пропуски: пункт — это одна строка с полем, четыре таких помещаются
// на 375 px без прокрутки. Выбор и порядок слов остаются по одному: их
// варианты занимают экран целиком.
const GROUP_TYPES = new Set(['gap'])
const GROUP_MAX = 4

function groupSteps(steps) {
  const out = []
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    if (!GROUP_TYPES.has(s.type)) {
      out.push(s)
      continue
    }
    let end = i + 1
    while (end < steps.length && end - i < GROUP_MAX && steps[end].type === s.type && steps[end].stage === s.stage) end++
    if (end - i < 2) {
      out.push(s)
      continue
    }
    // Заголовок у серии один — инструкция стадии; у второго и следующих
    // пунктов он подстановочный («Впиши пропущенное») и на экране не нужен.
    out.push({ stage: s.stage, type: 'group', title: s.title, sub: s.sub || '', items: steps.slice(i, end) })
    i = end - 1
  }
  return out
}

export function tasksToSteps(lesson) {
  const out = []
  // Подпись из предыдущего info-блока: достаётся первому же шагу, у которого
  // нет своего заголовка (см. leadOf).
  let lead = null
  const push = (step, ownTitle, fallbackSub) => {
    if (lead) {
      if (lead.title && !ownTitle) step.title = lead.title
      if (lead.sub && !step.sub) step.sub = lead.sub
      lead = null
    }
    if (!step.sub && fallbackSub) step.sub = fallbackSub
    out.push(step)
  }
  // Скрипты записи, придержанные до конца своей стадии.
  let held = []
  const flushHeld = () => {
    for (const h of held) out.push({ stage: h.stage, type: 'note', title: '', html: h.html })
    held = []
  }

  const tasks = lesson.tasks || []
  let prevStage = null
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    const stage = stageOf(t)
    const title = t.title || ''
    // Стадия сменилась — придержанный скрипт закрывает предыдущую.
    if (prevStage !== null && stage !== prevStage) flushHeld()
    prevStage = stage

    // Серия развёрнутых пар складывается обратно в одно соединение.
    const run = matchRunAt(tasks, i)
    if (run) {
      push(
        {
          stage,
          type: 'match',
          title: title || 'Соедини пары',
          options: t.options,
          pairs: tasks.slice(i, i + run).map((x) => ({ left: x.word, right: x.answer })),
        },
        !!title,
      )
      i += run - 1
      continue
    }

    switch (t.type) {
      case 'choice':
        if (!Array.isArray(t.options) || !t.answer) break
        push(
          {
            stage,
            type: 'choice',
            title: title || t.sub || 'Выбери верный вариант',
            prompt: t.word || '',
            options: t.options,
            answer: t.answer,
            // Слово на слух: в задании его нет нигде, кроме say, — плеер
            // озвучивает его синтезом вместо кнопки исходного курса.
            say: t.say || '',
          },
          !!title,
        )
        break

      case 'gap':
        push(
          {
            stage,
            type: 'gap',
            title: title || 'Впиши пропущенное',
            before: t.gapBefore || '',
            after: t.gapAfter || '',
            answers: t.answers && t.answers.length ? t.answers : String(t.answer || '').split('|').map((s) => s.trim()).filter(Boolean),
          },
          !!title,
        )
        break

      case 'order':
        // Порядок слов: правильный ответ — сама фраза, банк перемешивает плеер.
        push({ stage, type: 'order', title: title || 'Собери предложение', answer: t.answer || (t.words || []).join(' '), words: t.words || String(t.answer || '').split(/\s+/) }, !!title)
        break

      case 'listen':
        push({ stage, type: 'listen', title: title || 'Послушай и выбери', src: (t.tracks && t.tracks[0] && t.tracks[0].src) || null, options: t.options || [], answer: t.answer }, !!title)
        break

      case 'cards':
        // Слова стадии Vocabulary: одна карточка на слово, перевод открывается
        // по клику. Раньше словарь приезжал одной html-простынёй и печатался
        // заметкой — перевод был виден сразу, и презентация слов не работала.
        if (!Array.isArray(t.words) || !t.words.length) break
        push({ stage, type: 'cards', title: title || 'Слова урока', sub: t.sub || '', words: t.words }, !!title)
        break

      case 'multi':
        push({ stage, type: 'pick', title: title || 'Отметь, что тебе подходит', sub: t.sub || '', options: (t.options || []).map((label) => ({ label })) }, !!title)
        break

      case 'check': {
        // Пункты с эмодзи — это разминка «отметь, что тебе нравится»: в макете
        // она нарисована карточками с картинкой сверху, а не строчками с
        // галочкой. Строчки остаются у списков без эмодзи («Я могу…»).
        const cards = (t.items || []).map(splitEmoji)
        if (cards.length && cards.every((c) => c.emoji)) {
          push({ stage, type: 'pick', title: title || 'Отметь, что тебе подходит', sub: t.sub || '', options: cards }, !!title)
          break
        }
        push({ stage, type: 'checklist', title: title || 'Отметь, чему научился', sub: t.sub || '', items: t.items || [] }, !!title, 'Я могу…')
        break
      }

      case 'info':
      default: {
        if (!t.html) break
        // Мета-комментарий с названием учебника-источника убираем до всего
        // остального: без него блок часто оказывается просто подписью.
        const split = splitTranscript(stripSourceCredit(t.html))
        // Скрипт записи придержим до конца стадии — иначе он стоит перед
        // заданиями, и ответы списываются со спойлера.
        if (split.transcript) held.push({ stage, html: split.transcript })
        // Открытые задания на письмо вынимаем отдельными шагами: их образец
        // ответа тоже не должен показываться раньше самого письма.
        const opened = extractBlocks(split.rest, 'opentask')
        // Плашка «урок завершён» дублирует экран итогов плеера.
        const wrapped = extractBlocks(opened.rest, 'done-card').rest
        const can = canItemsOf(wrapped)
        const rest = can ? can.rest : wrapped

        // Подпись к следующему заданию — не отдельный экран.
        const l = leadOf(rest)
        if (l) lead = lead ? { title: lead.title || l.title, sub: [lead.sub, l.sub].filter(Boolean).join(' ') } : l
        else if (textOf(rest) || /<img\b/i.test(rest)) push({ stage, type: 'note', title, html: rest }, !!title)

        if (can) push({ stage, type: 'checklist', title: title || 'Отметь, чему научился', sub: '', items: can.items }, !!title, 'Я могу…')

        for (const open of opened.blocks) {
          const w = writeStepFrom(open, stage)
          push(w, !!w.title)
        }
        break
      }
    }
  }
  flushHeld()
  return groupSteps(out)
}
