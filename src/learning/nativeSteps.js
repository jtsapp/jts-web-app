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
//
// Здесь же разделяется локализация: перевод в контенте лежит склеенной строкой
// «слушать · тыңдау», и сторону выбираем по языку интерфейса (см. bilingual.js).
// Рантайм для этого и удобен — при смене языка урок пересобирается сам.
import { pickTr, localizeHtml } from './bilingual.js'

// Уровни, чей контент лежит в новом формате и играется пошаговым плеером.
// B2/C1 остаются на старом плеере: у них другой набор типов (chips, watch).
export const STEP_LEVELS = ['a0', 'a1']

export function isStepLevel(level) {
  return STEP_LEVELS.includes(String(level || '').toLowerCase())
}

// Блок, который несёт содержание сам по себе: картинка, таблица, список,
// спойлер, запись.
const RICH_BLOCK = /<(img|table|li|ul|ol|details|audio|iframe)\b/i

// Сколько в блоке отдельных кусков текста. Сетка «was | were» — это восемь
// знаков, но два куска, то есть противопоставление форм, а не обрывок; пустой
// пузырь с одной подписью «Note» — один кусок и ничего больше.
function textRuns(html) {
  return String(html || '')
    .split(/<[^>]+>/)
    .map((s) => s.replace(/&nbsp;/g, ' ').trim())
    .filter(Boolean).length
}

// Заметка становится экраном, если ей есть что показать: содержательная
// разметка, примеры из таблицы, несколько кусков текста или текст от 15
// знаков. Порог в 15 — короче реального предложения на этих уровнях не бывает,
// а вот обрывки («Note», «Oh no!») отсекает. Заголовок тоже считаем
// содержанием: короткий текст под собственным заголовком — это подпись к
// материалу, а не мусор.
function isWorthAScreen(html, title, examples) {
  if (RICH_BLOCK.test(html) || (examples && examples.length)) return true
  const text = textOf(html)
  return text.length >= 15 || textRuns(html) >= 2 || (!!title && text.length > 0)
}

// Название урока без хвоста стадии: «Coffee — yes. Mondays — no. · Warm-up» →
// «Coffee — yes. Mondays — no.». По нему стадии одного урока и собираются в
// один узел тропы.
export function lessonBaseTitle(title) {
  const s = String(title || '')
  const i = s.indexOf('·')
  return (i > 0 ? s.slice(0, i) : s).trim()
}

// Материал урока целиком. В нативных данных A0/A1 урок разложен по стадиям —
// каждая приходит отдельной записью «<урок> · <стадия>», и тропа из них давала
// по 6–14 узлов на одну тему (у A0 выходил 151 «урок» вместо 24). Тропу ведёт
// курс (public/course/<level>/index.json), а сюда сходится содержимое: стадии
// одного урока склеиваются в одну очередь экранов в порядке их кодов.
export function nativeLessonSteps(levelData, title, lang = 'ru') {
  const want = lessonBaseTitle(title).toLowerCase()
  if (!want) return []
  const parts = Object.values((levelData && levelData.lessons) || {}).filter(
    (l) => lessonBaseTitle(l.title).toLowerCase() === want,
  )
  return parts.flatMap((l) => tasksToSteps(l, lang))
}

// Узел тропы — это одна секция урока, и в данных его название приходит с
// хвостом: «Coffee — yes. Mondays — no. · Warm-up». В шапке плеера секция уже
// стоит отдельной жирной строкой, поэтому хвост в подзаголовке — дубль.
// Срезаем только тогда, когда последний сегмент действительно совпадает с
// одной из стадий урока: в названиях курса « · » встречается и по делу.
export function stripStageTail(title, steps) {
  const m = /^(.*\S)\s*·\s*([^·]+)$/.exec(String(title || ''))
  if (!m) return title
  const stages = new Set((steps || []).map((s) => String(s.stage || '').trim()))
  return stages.has(m[2].trim()) ? m[1] : title
}

// «1. Warm-up» → «Warm-up»: номер секции в шапке не нужен, там и так виден
// прогресс.
function stageOf(task) {
  const sec = String(task.sec || '').trim()
  return sec.replace(/^\d+\.\s*/, '') || 'Урок'
}

// «☕ coffee» → { emoji: '☕', label: 'coffee' }. Эмодзи в макете живёт отдельной
// строкой над подписью, поэтому его надо отделить, а не печатать в тексте.
//
// Кроме обычных значков ловим ещё два вида, которых \p{Extended_Pictographic}
// не знает: цифры-клавиши (1️⃣ — это «1» + VS16 + U+20E3) и флаги (🇯🇵 — пара
// региональных индикаторов). Без них разминки уроков «числа» и «страны»
// считались списком без значков и печатались строчками вместо карточек.
const EMOJI_ONE = /(?:\p{Regional_Indicator}\p{Regional_Indicator}|[0-9#*]️?⃣|\p{Extended_Pictographic}️?)/u
const EMOJI = new RegExp(`^(${EMOJI_ONE.source}(?:\\u200D${EMOJI_ONE.source})*)\\s*([\\s\\S]*)$`, 'u')

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
function stripSourceCredit(html) {
  const withoutMeta = extractBlocks(html, 'meta').rest
  // От блока плеера могла остаться пустая коробка — тогда убираем и её. Но у
  // части уроков A1 внутри .player лежит САМ текст для чтения вслух («Phone
  // battery dying? First, open Settings…»), и вырезать блок целиком значит
  // выбросить материал задания.
  const { rest, blocks } = extractBlocks(withoutMeta, 'player')
  const empty = blocks.every((b) => !textOf(b) && !/<(img|audio)\b/i.test(b))
  return empty ? rest : withoutMeta
}

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

// Подпись к чек-листу стоит прямо перед списком. Через общий leadOf её было не
// достать: следом за списком в том же блоке идёт «🔑 KEY WORD LIST» со своим
// списком слов, и блок переставал считаться подписью — на экране оставался
// подстановочный заголовок «Отметь, чему научился».
const CAN_LEAD = /(?:<div[^>]*class="instruction"[^>]*>((?:(?!<\/div>)[\s\S])*?)<\/div>\s*)?(?:<p[^>]*class="subline"[^>]*>((?:(?!<\/p>)[\s\S])*?)<\/p>\s*)?$/i

function canItemsOf(html) {
  const m = CAN_LIST.exec(html)
  if (!m) return null
  const items = [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    // Галочка в начале пункта — украшение разметки, а не текст пункта: в
    // чек-листе плеера своя отметка, и «✓ say what I like» читалось бы как
    // «уже отмечено».
    .map((li) => textOf(li[1].replace(/<span[^>]*class="[^"]*\btick\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')))
    .filter(Boolean)
  if (!items.length) return null
  const before = html.slice(0, m.index)
  const lead = CAN_LEAD.exec(before)
  const head = (lead && lead[0]) || ''
  return {
    items,
    rest: before.slice(0, before.length - head.length) + html.slice(m.index + m[0].length),
    title: textOf((lead && lead[1]) || ''),
    sub: textOf((lead && lead[2]) || ''),
  }
}

// Каркас ответа в поле: в макете плейсхолдер — не «Введите ответ», а рамка
// будущего ответа («I like _____. I don’t like _____.»). В контенте курса
// такой строки нет, зато есть образец ответа — из него каркас и собираем:
// у каждого предложения оставляем начало (подлежащее и сказуемое), остальное
// прячем. Второе слово-связка держим при первом, иначе «I don’t like Mondays»
// обрывалось бы на «I don’t».
const FRAME_KEEP = /^(don['’]?t|doesn['’]?t|do|does|am|is|are|can|will|would|have|has)$/i
// Каркас строим только из повествовательных предложений с подлежащим-
// местоимением: у вопросов и назывных («What do you like?», «My phone is old»)
// механический разрез врёт про язык — «What do you _____.» не предложение.
// Не собрался целиком — плейсхолдер остаётся обычным «Введите ответ».
const FRAME_SUBJECT = /^(I|I['’]m|I['’]ve|You|He|She|It|It['’]s|We|They|There|There['’]s)$/i
const FRAME_MAX_SENTENCES = 3

// Без lookbehind (`(?<=…)`): Safari до 16.4 такую регулярку не понимает, и это
// ошибка РАЗБОРА — файл не запускается целиком, а с ним и весь чанк. Границу
// ставим заменой с меткой (lookahead Safari понимает давно).
const SENTENCE_BREAK = '\u0000'

function answerFrame(model) {
  const text = String(model || '').trim()
  if (!text) return ''
  const sentences = text
    .replace(/([.!?])\s+/g, `$1${SENTENCE_BREAK}`)
    .split(SENTENCE_BREAK)
    .filter(Boolean)
  if (!sentences.length || sentences.length > FRAME_MAX_SENTENCES) return ''
  const frames = sentences.map((s) => {
    const end = /[.!?]$/.test(s) ? s.slice(-1) : '.'
    if (end !== '.') return null
    const words = s.replace(/[.!?]+$/, '').split(/\s+/)
    if (words.length < 3 || !FRAME_SUBJECT.test(words[0])) return null
    const keep = FRAME_KEEP.test(words[1]) ? 3 : 2
    if (words.length <= keep) return null
    return `${words.slice(0, keep).join(' ')} _____.`
  })
  return frames.every(Boolean) ? frames.join(' ') : ''
}

// Сам образец ответа внутри пузыря — первый абзац: над ним стоит подпись
// «Model answer» (.blab), а под ним разбор «Check yourself». Каркас строим
// только по абзацу с ответом, иначе в плейсхолдер уезжает вся эта обвязка.
function modelSentence(html) {
  const body = String(html || '').replace(/<div[^>]*class="[^"]*\bblab\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  const p = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(body)
  return p ? textOf(p[1]) : ''
}

function writeStepFrom(inner, stage) {
  const { rest, blocks } = extractBlocks(inner, 'bubble')
  const instruction = /<div[^>]*class="[^"]*\binstruction\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(rest)
  return {
    stage,
    type: 'write',
    title: instruction ? textOf(instruction[1]) : '',
    sub: '',
    placeholder: answerFrame(modelSentence(blocks.join(''))),
    // Образец — размеченный (в нём список «Check yourself»), плоский текст
    // склеил бы его в одну строку.
    modelHtml: blocks.length ? blocks.join('') : '',
    model: blocks.length ? textOf(blocks.join('')) : '',
  }
}

// Спойлеры стадии: скрипт записи (<summary>What you heard</summary>) и разбор
// ответов (<summary>Why these answers</summary>). В исходном курсе они не
// видны, пока задания стадии не сделаны. По одному заданию на экран они
// оказывались ПЕРЕД ними: студент открывал спойлер и списывал ответы. Отличаем
// их от справочника грамматики (тот же класс gref) по заголовку спойлера.
//
// Разбор ответов держим тут же не только ради спойлера: пока он лежал в блоке
// подписи, блок переставал быть подписью (см. leadOf) и становился отдельным
// экраном — а инструкция стадии не доезжала до самих заданий, и на них
// печаталось подстановочное «Выбери верный вариант».
const SPOILER_SUMMARY = /what you heard|audioscript|transcript|script|why these answers/i

function splitSpoilers(html) {
  const s = String(html || '')
  const found = []
  for (const m of s.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)) {
    const summary = /<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(m[1])
    if (summary && SPOILER_SUMMARY.test(textOf(summary[1]))) found.push(m[0])
  }
  if (!found.length) return { rest: s, spoiler: '' }
  let rest = s
  for (const block of found) rest = rest.replace(block, '')
  return { rest, spoiler: found.join('') }
}

// Заголовок, продублированный первым пунктом списка под ним: в исходном курсе
// блок «🔧 Build it yourself» приезжает и заголовком, и первой строкой своего
// же списка. На странице курса это терялось, а одним заданием на экран
// читается как опечатка — заголовок напечатан дважды подряд.
// Тело заголовка не должно перепрыгивать через свой же закрывающий тег: с
// обычным ленивым [\s\S]*? совпадение растягивалось от ПЕРВОЙ инструкции слайда
// до списка следующей, тексты не сходились, и дубль оставался на экране.
const ECHO_DIV = /(<div[^>]*class="[^"]*\binstruction\b[^"]*"[^>]*>((?:(?!<\/div>)[\s\S])*?)<\/div>\s*<ul[^>]*>)\s*<li[^>]*>((?:(?!<\/li>)[\s\S])*?)<\/li>/gi
const ECHO_H4 = /(<h4[^>]*>((?:(?!<\/h4>)[\s\S])*?)<\/h4>\s*<ul[^>]*>)\s*<li[^>]*>((?:(?!<\/li>)[\s\S])*?)<\/li>/gi

function dropEchoedHeading(html) {
  const cut = (m, head, headText, firstLi) => (textOf(headText) && textOf(headText) === textOf(firstLi) ? head : m)
  return String(html || '').replace(ECHO_DIV, cut).replace(ECHO_H4, cut)
}

// Правило вида «Use I like + a thing you enjoy.» в макете нарисовано формулой:
// части фразы, между ними фиолетовый кружок с плюсом. Строим её из той же
// строки курса, а не рисуем отдельным контентом: строки в уроках разные, и
// вручную их не переписать (151 урок в A0, 287 в A1).
//
// Подлежащее отделяем от сказуемого только когда фраза начинается с местоимения
// («I like» → «I» ⊕ «like»): в макете так, а на любой другой строке лишний
// разрез соврал бы про грамматику.
const EGS_UL = /<ul([^>]*)class="([^"]*\begs\b[^"]*)"([^>]*)>([\s\S]*?)<\/ul>/gi
const USE_LINE = /^use\s+(.+?)\s*\+\s*(.+?)[.\s]*$/i
const PRONOUN = /^(I|you|he|she|it|we|they)\s+(.+)$/i

function formulaRow(text) {
  const m = USE_LINE.exec(text)
  if (!m) return null
  const p = PRONOUN.exec(m[1].trim())
  const parts = p ? [p[1], p[2], m[2].trim()] : [m[1].trim(), m[2].trim()]
  const plus = '<span class="gf__op" aria-hidden="true">+</span>'
  return `<li class="gf">${parts.map((x) => `<span class="gf__p">${x}</span>`).join(plus)}</li>`
}

function formulaize(html) {
  return String(html || '').replace(EGS_UL, (whole, a, cls, b, inner) => {
    let built = 0
    const next = inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (li, body) => {
      const row = formulaRow(textOf(body))
      if (!row) return li
      built++
      return row
    })
    return built ? `<ul${a}class="${cls} has-gf"${b}>${next}</ul>` : whole
  })
}

// Карусель примеров под карточкой правила (в макете — отдельный ряд под ней).
// Берём примеры из таблицы правила: первая колонка — лицо («I»), остальные и
// есть готовые предложения, которые макет показывает карточками.
const GTABLE = /<table[^>]*class="[^"]*\bgtable\b[^"]*"[^>]*>([\s\S]*?)<\/table>/i

function tableExamples(html) {
  const t = GTABLE.exec(String(html || ''))
  if (!t) return null
  const out = []
  for (const row of t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => textOf(c[1]))
    // Пропускаем первую колонку (лицо) и однословные ячейки — примером они не
    // являются.
    for (const cell of cells.slice(1)) if (/\s/.test(cell)) out.push(cell)
  }
  return out.length ? out : null
}

// Разминка «отметь, что про тебя» в части уроков приезжает не заданием, а
// вёрсткой: <div class="grid3"><div class="card"><b>🏠</b> at home</div>…</div>.
// Экраном это печаталось заметкой — серая простыня, где значок стоит отдельной
// строкой над подписью и ничего не нажимается. В макете (и в тех уроках, где то
// же самое лежит заданием check) это карточки со значком сверху. Таких блоков
// 23 в A0 и 31 в A1 — все они разминки «Tap the …».
const GRID_CARD = /<div[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

function gridPicksOf(html) {
  const { rest, blocks } = extractBlocks(html, 'grid3')
  if (!blocks.length) return null
  const groups = blocks.map((b) => [...b.matchAll(GRID_CARD)].map((c) => splitEmoji(textOf(c[1]))))
  // Собираем карточки, только если значок есть у КАЖДОЙ карточки каждого блока.
  // Иначе это не разминка, а вёрстка чего-то другого — её не трогаем и
  // оставляем блок в разметке как был.
  if (!groups.every((g) => g.length && g.every((c) => c.emoji))) return null
  return { rest, groups }
}

// «Tap one» — выбор ровно один, «Tap the ones you like» — сколько угодно.
const SINGLE_PICK = /\btap one\b|\bchoose one\b|\bpick one\b|\bselect one\b/i

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
// Опознаём по двум признакам сразу — структуре и инструкции.
//
// Структура: подряд идущие choice одной стадии с ОДИНАКОВЫМ набором вариантов
// и НЕПОВТОРЯЮЩИМИСЯ ответами. Двух пар мало (это честно два вопроса), с трёх
// — уже упражнение.
//
// Одной структуры недостаточно. На уровнях A2/B1 такую же форму имеют задания
// на классификацию («Now or then?», «Who is each sentence about?») и пропуски
// на артикли («Choose a, the or nothing») — там общий банк вариантов, а
// неповторяющиеся ответы выходят случайно. Собрать из них соединение значит
// пообещать студенту, что каждый вариант используется ровно раз, — и соврать.
// Поэтому требуем ещё и инструкцию: у настоящего соединения она об этом прямо
// говорит («Match the word to the picture»), и такова она у всех 23 упражнений
// A0.
const MIN_MATCH_PAIRS = 3
const MATCH_INSTRUCTION = /\bmatch(es|ing)?\b|соедин/i

// Сколько пар помещается в один экран. Упражнение в источнике бывает и на
// десять слов: одним экраном оно не влезает даже в 1440 (пункты плюс банк
// вариантов уезжают под сгиб), а сердце за него снимается один раз — то есть
// одна ошибка из десяти стоит столько же, сколько десять. Режем на экраны по
// четыре пары и делим остаток поровну, чтобы последний экран не остался с
// одной парой: соединение из одной пары решается не глядя.
const MATCH_PER_SCREEN = 4

function splitEvenly(items, max) {
  const n = Math.ceil(items.length / max)
  const base = Math.floor(items.length / n)
  const extra = items.length % n
  const out = []
  for (let i = 0, from = 0; i < n; i++) {
    const size = base + (i < extra ? 1 : 0)
    out.push(items.slice(from, from + size))
    from += size
  }
  return out
}

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

// Утверждения «True / False» в источнике лежат отдельными вопросами подряд, и
// по одному на экран стадия Practice превращалась в десять одинаковых экранов с
// двумя кнопками. В макете они стоят списком на ОДНОМ экране с общей кнопкой
// «Проверить» — строка утверждения короткая, пять таких помещаются и на
// телефоне. Экран засчитывается целиком, как соединение и пропуски: это одно
// упражнение, а не пять вопросов.
const ROWS_PER_SCREEN = 5

// Признак — не сам текст «True/False», а форма: вопрос-утверждение и ровно два
// одинаковых варианта подряд. Так же выглядят «Now or then?» и другие
// двухкнопочные задания курса, и им этот экран подходит ровно так же.
const isBinary = (s) => s.type === 'choice' && (s.options || []).length === 2 && !!s.prompt && !s.say

function groupBinary(steps) {
  const out = []
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    if (!isBinary(s)) {
      out.push(s)
      continue
    }
    const bank = JSON.stringify(s.options)
    let end = i + 1
    while (end < steps.length && isBinary(steps[end]) && steps[end].stage === s.stage && JSON.stringify(steps[end].options) === bank) end++
    if (end - i < 2) {
      out.push(s)
      continue
    }
    // Заголовок серии — инструкция стадии, она досталась первому вопросу из
    // предыдущего info-блока; у остальных он подстановочный и на экране не нужен.
    for (const chunk of splitEvenly(steps.slice(i, end), ROWS_PER_SCREEN)) {
      out.push({
        stage: s.stage,
        type: 'rows',
        title: s.title,
        sub: s.sub || '',
        options: s.options,
        items: chunk.map((x) => ({ q: x.prompt, answer: x.answer })),
      })
    }
    i = end - 1
  }
  return out
}

export function tasksToSteps(lesson, lang = 'ru') {
  const tr = (s) => pickTr(s, lang)
  const trAll = (arr) => (arr || []).map(tr)
  const out = []
  // Подпись из предыдущего info-блока: достаётся первому же шагу, у которого
  // нет своего заголовка (см. leadOf).
  let lead = null
  // Она же относится ко ВСЕЙ серии однотипных заданий стадии, а не только к
  // первому из них. Инструкция «Put the words in order.» стоит в курсе один раз
  // перед десятью предложениями; по одному заданию на экран второму и
  // следующим доставался подстановочный заголовок («Собери предложение»,
  // «Выбери верный вариант») — он и попал в ревью макета.
  let runLead = null
  const push = (step, ownTitle, fallbackSub) => {
    const sameRun = runLead && runLead.stage === step.stage && runLead.type === step.type
    if (lead) {
      if (lead.title && !ownTitle) step.title = lead.title
      if (lead.sub && !step.sub) step.sub = lead.sub
      lead = null
      runLead = { title: step.title, sub: step.sub || '', type: step.type, stage: step.stage }
    } else if (sameRun && !ownTitle) {
      step.title = runLead.title
      if (!step.sub) step.sub = runLead.sub
    } else if (!sameRun) {
      runLead = null
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

    // Серия развёрнутых пар складывается обратно в одно соединение — но
    // только если инструкция обещает именно соединение (см. MATCH_INSTRUCTION).
    // Подпись к упражнению лежит в предыдущем info-блоке и ждёт в lead.
    const run = MATCH_INSTRUCTION.test(`${lead?.title || ''} ${lead?.sub || ''} ${title} ${t.sub || ''}`)
      ? matchRunAt(tasks, i)
      : 0
    if (run) {
      // Банк вариантов у экрана — ответы ЭТОГО экрана, а не всего упражнения:
      // иначе на четыре пункта приходилось бы десять вариантов, и обещание
      // «каждый вариант используется один раз» переставало быть правдой.
      const screens = splitEvenly(tasks.slice(i, i + run), MATCH_PER_SCREEN).map((chunk) => ({
        stage,
        type: 'match',
        title: title || 'Соедини пары',
        options: chunk.map((x) => tr(x.answer)),
        pairs: chunk.map((x) => ({ left: x.word, right: tr(x.answer) })),
      }))
      // Подпись из предыдущего info-блока достаётся первому экрану серии —
      // остальные берут уже её, иначе со второго экрана заголовок подменялся
      // подстановочным «Соедини пары».
      push(screens[0], !!title)
      for (const s of screens.slice(1)) out.push({ ...s, title: screens[0].title, sub: screens[0].sub || '' })
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
            options: trAll(t.options),
            answer: tr(t.answer),
            // Слово на слух: в задании его нет нигде, кроме say. Если слово
            // записано (scripts/make-lesson-audio.js) — плеер играет файл, тот
            // же самый, что звучит на карточке словаря; записи нет —
            // договаривает синтезом браузера, как делал исходный курс.
            say: t.say || '',
            sayTrack: t.sayTrack || '',
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

      case 'order': {
        // Порядок слов: правильный ответ — сама фраза, банк перемешивает плеер.
        // В данных уровня answer лежит СПИСКОМ слов (["I","like","coffee"]) —
        // без склейки плеер сравнивал собранную фразу со строкой
        // «I,like,coffee» и браковал любой ответ: все задания «собери
        // предложение» в A0/A1 были непроходимыми.
        const words = t.words && t.words.length ? t.words : []
        const answer = Array.isArray(t.answer) ? t.answer.join(' ') : String(t.answer || '')
        push(
          {
            stage,
            type: 'order',
            title: title || 'Собери предложение',
            answer: answer || words.join(' '),
            words: words.length ? words : answer.split(/\s+/).filter(Boolean),
          },
          !!title,
        )
        break
      }

      case 'listen':
        push({ stage, type: 'listen', title: title || 'Послушай и выбери', src: (t.tracks && t.tracks[0] && t.tracks[0].src) || null, options: trAll(t.options), answer: tr(t.answer) }, !!title)
        break

      case 'cards': {
        // Слова стадии Vocabulary: одна карточка на слово, перевод открывается
        // по клику. Раньше словарь приезжал одной html-простынёй и печатался
        // заметкой — перевод был виден сразу, и презентация слов не работала.
        if (!Array.isArray(t.words) || !t.words.length) break
        const fromLead = !!lead && !title
        const card = { stage, type: 'cards', title: title || 'Слова урока', sub: t.sub || '', words: t.words }
        push(card, !!title)
        // В макете крупной фиолетовой строкой идёт инструкция («Tap any picture
        // to see translation»), а подпись словаря стоит над ней мелкой. В
        // разметке A0/A1 инструкция приезжает подписью предыдущего блока и
        // садится в title — то есть ровно наоборот; у перенесённого курса
        // (A2/B1) роли уже такие, как надо. Меняем местами только первый случай.
        if (fromLead && card.sub) [card.title, card.sub] = [card.sub, card.title]
        break
      }

      case 'multi': {
        // Значок отделяем и здесь: в макете он стоит строкой над подписью, а
        // печатаясь внутри неё («📖 read») карточка теряет картинку.
        const card = { stage, type: 'pick', title: title || 'Отметь, что тебе подходит', sub: t.sub || '', options: trAll(t.options).map(splitEmoji) }
        push(card, !!title)
        if (SINGLE_PICK.test(`${card.title} ${card.sub}`)) card.single = true
        break
      }

      case 'check': {
        // Пункты с эмодзи — это разминка «отметь, что тебе нравится»: в макете
        // она нарисована карточками с картинкой сверху, а не строчками с
        // галочкой. Строчки остаются у списков без эмодзи («Я могу…»).
        const cards = trAll(t.items).map(splitEmoji)
        if (cards.length && cards.every((c) => c.emoji)) {
          push({ stage, type: 'pick', title: title || 'Отметь, что тебе подходит', sub: t.sub || '', options: cards }, !!title)
          break
        }
        push({ stage, type: 'checklist', title: title || 'Отметь, чему научился', sub: t.sub || '', items: trAll(t.items) }, !!title, 'Я могу…')
        break
      }

      case 'info':
      default: {
        if (!t.html) break
        // Мета-комментарий с названием учебника-источника убираем до всего
        // остального: без него блок часто оказывается просто подписью.
        const split = splitSpoilers(stripSourceCredit(localizeHtml(t.html, lang)))
        // Скрипт записи и разбор ответов придержим до конца стадии — иначе они
        // стоят перед заданиями, и ответы списываются со спойлера.
        if (split.spoiler) held.push({ stage, html: split.spoiler })
        // Открытые задания на письмо вынимаем отдельными шагами: их образец
        // ответа тоже не должен показываться раньше самого письма.
        const opened = extractBlocks(split.rest, 'opentask')
        // Плашка «урок завершён» дублирует экран итогов плеера.
        const wrapped = extractBlocks(opened.rest, 'done-card').rest
        const can = canItemsOf(wrapped)
        // Карточки разминки вынимаем из вёрстки до всего остального — иначе они
        // печатаются заметкой. У блока с записью ничего не трогаем: там разметка
        // относится к самой дорожке.
        const grid = t.track ? null : gridPicksOf(can ? can.rest : wrapped)
        // Правило по макету: формулы вместо строк «Use X + Y», примеры из
        // таблицы каруселью под карточкой, и без задвоенного заголовка.
        const rest = formulaize(dropEchoedHeading(grid ? grid.rest : can ? can.rest : wrapped))
        const examples = tableExamples(rest)

        // Текст, которому сгенерировали запись (scripts/make-lesson-audio.js),
        // становится экраном слушания: плеер сверху, материал под ним. Без
        // записи он остаётся немой заметкой — ровно как было в курсе, где
        // читать его должен был браузерный синтез.
        if (t.track) {
          push({ stage, type: 'listen', title, src: t.track, options: [], html: textOf(rest) ? rest : '' }, !!title)
          break
        }

        // Подпись к следующему заданию — не отдельный экран.
        const l = leadOf(rest)
        // Подпись может приехать двумя блоками подряд (инструкция отдельным
        // заданием, строка под ней — следующим). Раньше при склейке второй
        // заголовок просто отбрасывался: «Tap one. There is no wrong answer.»
        // исчезала с экрана целиком. Теперь она становится подписью.
        if (l)
          lead = lead
            ? { title: lead.title || l.title, sub: [lead.sub, lead.title ? l.title : '', l.sub].filter(Boolean).join(' ') }
            : l
        // Заметка длиной в пару слов — не экран: «Note», «Oh no!» — это
        // обрывок реплики из примера, а не материал. Картинку и примеры из
        // таблицы такой отбор не задевает: они несут содержание сами.
        else if (isWorthAScreen(rest, title, examples)) push({ stage, type: 'note', title, html: rest, examples }, !!title)

        if (grid)
          for (const options of grid.groups) {
            const card = { stage, type: 'pick', title: title || 'Отметь, что тебе подходит', sub: '', options }
            push(card, !!title)
            // «Tap one» — выбор один: инструкция об этом говорит прямо, и
            // отмечать десяток карточек в таком задании нечего.
            if (SINGLE_PICK.test(`${card.title} ${card.sub}`)) card.single = true
          }

        if (can)
          push(
            { stage, type: 'checklist', title: title || can.title || 'Отметь, чему научился', sub: can.sub || '', items: can.items },
            !!(title || can.title),
            'Я могу…',
          )

        for (const open of opened.blocks) {
          const w = writeStepFrom(open, stage)
          // Открытое задание со своей инструкцией подпись стадии не забирает:
          // она адресована следующему заданию блока, а тут её просто гасило
          // (стадия Listening теряла «Listen. Tick the activities you hear.»).
          if (w.title) out.push(w)
          else push(w, false)
        }
        break
      }
    }
  }
  flushHeld()
  return spreadAudio(groupBinary(groupSteps(out)))
}

// Плеер дорожки в источнике приезжает ОТДЕЛЬНЫМ блоком, а задание к нему —
// следующим. По одному заданию на экран получался экран-тупик: круглая кнопка
// «play» и «Продолжить», а варианты уезжали на следующий экран, где послушать
// заново было уже нечем. В макете плеер стоит НАД самим заданием — так же, как
// он стоял на странице курса, где одна запись обслуживала всю стадию.
const AUDIO_TARGETS = new Set(['pick', 'choice', 'rows', 'group', 'gap', 'order', 'write', 'checklist'])

// Сколько вопросов к записи помещается на экран. Шесть, а не пять: в источнике
// самая частая длина упражнения — ровно шесть строк, и при пятёрке они
// разъезжались бы на два экрана, то есть запись пришлось бы слушать дважды.
const AUDIO_ROWS_PER_SCREEN = 6

// Вопрос к записи — короткая строка со своими вариантами: «post a ___» и три
// слова на выбор. 357 из 362 таких шагов в A1 именно такие (медиана вопроса —
// 28 символов, вариантов почти всегда три), поэтому они спокойно встают
// списком на один экран.
const isAudioRow = (s) => s.type === 'choice' && !!s.prompt && (s.options || []).length >= 2 && !s.say

function spreadAudio(steps) {
  const out = []
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    const bare = s.type === 'listen' && !(s.options || []).length && !s.html && !!s.src
    if (!bare) {
      out.push(s)
      continue
    }
    // Область действия записи — до следующей записи или до конца стадии.
    let end = i + 1
    while (end < steps.length && steps[end].stage === s.stage && steps[end].type !== 'listen') end++
    const scope = steps.slice(i + 1, end)
    const made = []
    for (let j = 0; j < scope.length; j++) {
      const run = []
      while (j < scope.length && isAudioRow(scope[j])) run.push(scope[j++])
      // Серия вопросов к одной записи собирается в список на одном экране —
      // ровно так стадия и выглядела на странице курса: плеер сверху, под ним
      // все вопросы. Разложенная по одному вопросу на экран, она заставляла
      // слушать дорожку заново на каждом (запись — 50–90 секунд).
      if (run.length >= 2)
        for (const chunk of splitEvenly(run, AUDIO_ROWS_PER_SCREEN))
          made.push({
            stage: s.stage,
            type: 'rows',
            title: run[0].title,
            sub: run[0].sub || '',
            audio: s.src,
            items: chunk.map((x) => ({ q: x.prompt, options: x.options, answer: x.answer })),
          })
      else if (run.length === 1) made.push({ ...run[0], audio: s.src })
      if (j < scope.length) {
        const x = scope[j]
        made.push(AUDIO_TARGETS.has(x.type) ? { ...x, audio: s.src } : x)
      }
    }
    // Приделать не к чему (запись без заданий) — оставляем отдельным экраном.
    if (!made.some((x) => x.audio)) {
      out.push(s)
      continue
    }
    out.push(...made)
    i = end - 1
  }
  return out
}
