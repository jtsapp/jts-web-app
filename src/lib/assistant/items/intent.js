// Просит ли ученик открыть что-то конкретное — урок курса, тему, текст… — и что именно
// (29.10.2026). Решает код, а не модель: по ответу роут прикладывает к вопросу каталог
// этих видов (catalog.js), и только тогда модель видит названия и адреса. Каталог
// нужен не каждому вопросу — «почему мой ответ в этом уроке неверный?» о другом, —
// а лишние полторы тысячи токенов на каждый вопрос дороги и путают модель.
//
// Поэтому вид материала («урок», «тема», «текст»…) одного недостаточно: нужен и знак
// просьбы — глагол «открой / покажи / хочу / где», номер, «следующий» или «про …».
// Слова — русские, казахские и английские: ученики говорят с Луной на своём языке.
//
// \b в JS видит только латиницу, поэтому границы слов — через \p{L} (флаг u). Перед
// словом — «начало или не буква», а не lookbehind: его не разбирает Safari до 16.4, и
// сторож safariSyntax.test.js запрещает его во всех исходниках, серверных тоже.

import { DESTINATIONS } from '../destinations.js'

const w = (src) => new RegExp(src, 'iu')
const NOT_LETTER_BEFORE = '(?:^|[^\\p{L}])'
const NOT_LETTER_AFTER = '(?!\\p{L})'

const ASK = w(
  [
    'откр', 'покаж', 'показ', 'включ', 'запуст', 'перейд', 'хочу', 'давай', 'начн', 'начать', 'продолж', 'найд', 'где\\s',
    `${NOT_LETTER_BEFORE}аш(?:ып|ыңыз|шы)?${NOT_LETTER_AFTER}`, 'ашып', 'көрсет', 'қос', 'бастай',
    `${NOT_LETTER_BEFORE}(?:open|show|start|play|continue|find|where|take me|go to)${NOT_LETTER_AFTER}`,
  ].join('|'),
)
// Глагол «открой» в чистом виде — для просьбы по одному названию, без слова-вида («открой
// Остров сокровищ»). «Хочу», «давай», «где» сюда не входят: «хочу понять правило» и «где
// кнопка?» — не просьбы открыть вещь.
const OPEN_VERB = w(
  [
    'откр', 'покаж', 'включ', 'запуст',
    `${NOT_LETTER_BEFORE}аш(?:ып|ыңыз|шы)?${NOT_LETTER_AFTER}`, 'көрсет', `${NOT_LETTER_BEFORE}қос`,
    `${NOT_LETTER_BEFORE}(?:open|show|play|start)${NOT_LETTER_AFTER}`,
  ].join('|'),
)
const NEXT = w('следующ|келесі|next')
const ABOUT = w(`${NOT_LETTER_BEFORE}(?:про|about|туралы)${NOT_LETTER_AFTER}`)
const NUMBER = /\d/

const KIND = {
  live: w('преподавател|учител|живо[йм] урок|заняти|расписани|teacher|live lesson|мұғалім|ұстаз|сабағым'),
  homework: w(`домашк|домашн|${NOT_LETTER_BEFORE}дз${NOT_LETTER_AFTER}|homework|үй жұмыс`),
  workbook: w('воркбук|workbook|рабоч\\p{L}* тетрад'),
  situation: w('ситуаци|situation|жағда'),
  shadowing: w('ш[эе]доуинг|shadowing'),
  words: w('картинк|сцен[уаыое]|picture|сурет'),
  // «book» — отдельным словом: иначе «workbook» был бы книжкой. «Кітап» перед гласной —
  // «кітабын»: п переходит в б.
  book: w(`книг|книж|кіта[пб]|${NOT_LETTER_BEFORE}(?:audio)?books?${NOT_LETTER_AFTER}`),
  comic: w('комикс|comic'),
  karaoke: w(`караоке|karaoke|песн|${NOT_LETTER_BEFORE}songs?${NOT_LETTER_AFTER}|${NOT_LETTER_BEFORE}ән(?:ді|ін|ге|дер)?${NOT_LETTER_AFTER}`),
  tale: w(`сказк|ертег|fairy\\s?tales?|${NOT_LETTER_BEFORE}tales?${NOT_LETTER_AFTER}`),
  speedread: w('скорочтени|быстр\\p{L}* чтени|speed\\s?reading|жылдам оқ'),
  listen: w('just to listen|диктант|dictation'),
  writing: w(`эссе|essay|сочинени|письм|жалоб|${NOT_LETTER_BEFORE}writing${NOT_LETTER_AFTER}|жазылым|${NOT_LETTER_BEFORE}жазу`),
  arcade: w('аркад|arcade|word rush|speak or die|бегун|runner'),
  cartoon: w('мульт|cartoon|сериал|серию'),
  prep: w('предлог|preposition|септеулік|шылау'),
  // «Звук» сюда не входит: «включи звук» — кнопка, а не тема произношения.
  pron: w('произнош|pronunciation|произнес|айтылу'),
  reading: w(`текст|чтени|статью|reading|${NOT_LETTER_BEFORE}text${NOT_LETTER_AFTER}|мәтін|оқылым`),
  grammar: w(
    `грамматик|${NOT_LETTER_BEFORE}тем[уаые]?${NOT_LETTER_AFTER}|правил[оау]|grammar|topic|тақырып|` +
      `${NOT_LETTER_BEFORE}(?:present|past|future|perfect|continuous|passive|conditional|modal|articles?|comparatives?|gerund|infinitive)${NOT_LETTER_AFTER}`,
  ),
  game: w(`${NOT_LETTER_BEFORE}игр\\p{L}*|${NOT_LETTER_BEFORE}games?${NOT_LETTER_AFTER}|ойын`),
  lesson: w('урок|lesson|сабақ'),
}

// Уровень, названный в реплике: «B1», «b1», а кириллицей — «В1», «а2» (так их и печатают).
const LEVEL_RE = /(?:^|[^\p{L}])([aаbвcс])([0-2])(?!\d)/iu
const CYR = { а: 'A', в: 'B', с: 'C' }
const LEVELS = new Set(['A0', 'A1', 'A2', 'B1', 'B2', 'C1'])

function levelOf(text, userLevel) {
  const m = LEVEL_RE.exec(text)
  if (m) {
    const letter = CYR[m[1].toLowerCase()] || m[1].toUpperCase()
    const level = `${letter}${m[2]}`
    if (LEVELS.has(level)) return level
  }
  const own = String(userLevel || '').toUpperCase()
  return LEVELS.has(own) ? own : null
}

// «Открой Остров сокровищ», «включи Frozen»: вид не назван, но и раздела в реплике нет —
// значит, ученик назвал вещь. Тогда каталог всех видов с названиями (GUESS_KINDS), и модель
// ищет по смыслу: название бывает переведено («Остров сокровищ» — Treasure Island), так что
// сверка строк в коде тут не годится. Только то, что зовут одним названием, — книги, песни,
// сказки, комиксы… Курса, тем, текстов, ситуаций, сцен слов и мультфильмов здесь нет: их без
// слова «урок» / «тема» / «текст» / «мультик» не просят, а списки длинные (каталог и так
// ~250 строк — книжки, комиксы, караоке).
export const GUESS_KINDS = ['book', 'comic', 'karaoke', 'tale', 'speedread', 'listen', 'shadowing', 'prep', 'pron', 'arcade']

// Слова разделов (имена destinations.js и вкладки): «открой словарь», «открой Word Hunt» —
// раздел, а не вещь, и каталог ему не нужен. Основа — первые 5 букв слова.
const SECTION_WORDS = [
  'главн', 'практик', 'профил', 'настро', 'тариф', 'минут', 'тьютор', 'словар', 'аудир', 'письм', 'говор', 'чтени',
  'расписан', 'игры', 'тест', 'экзам', 'ielts', 'buddy', 'speaking', 'сөздік', 'тыңда', 'жазыл', 'айтыл', 'оқылым',
  // Кнопки и части экрана: «открой следующее задание», «включи запись» — нажатие, не вещь.
  'задани', 'упражн', 'вопрос', 'ответ', 'кнопк', 'запис', 'микрофон', 'звук', 'подсказ', 'тапсырм', 'жауап',
  'task', 'exercise', 'question', 'answer', 'button', 'record', 'hint',
]
const QUESTION = w(`${NOT_LETTER_BEFORE}(?:как|почему|зачем|что|сколько|how|why|what|қалай|неге|не үшін)${NOT_LETTER_AFTER}`)
// Что остаётся от «открой мне это, пожалуйста» — не название.
const FILLER_SRC =
  `${NOT_LETTER_BEFORE}(?:это|эту|этот|эта|ту|тот|та|его|её|ее|их|там|тут|здесь|мне|нам|пожалуйста|плиз|да|ну|вот|сам|сама|сейчас|снова|ещё|еще|штук[ауи]?|вещь|` +
  `луна|айзере|please|it|this|that|me|now|again|мұны|осыны|соны|оны|маған|бер|беріңізші|берші|қазір)${NOT_LETTER_AFTER}`

const SECTION_NAMES = [
  ...new Set(
    DESTINATIONS.flatMap((d) => Object.values(d.name))
      .flatMap((name) => name.toLowerCase().match(/\p{L}{4,}/gu) || [])
      .map((word) => word.slice(0, 5)),
  ),
]

function namesSection(t, sectionNames) {
  const low = t.toLowerCase()
  return SECTION_WORDS.some((s) => low.includes(s)) || sectionNames.some((s) => low.includes(s))
}

function namesThing(t) {
  const rest = t.replace(new RegExp(`(?:${OPEN_VERB.source})\\p{L}*`, 'giu'), ' ').replace(new RegExp(FILLER_SRC, 'giu'), ' ')
  return (rest.match(/\p{L}{3,}/gu) || []).length > 0
}

/**
 * { kinds, level } — что приложить к вопросу, или null, если ученик ни о чём таком не просит.
 * Порядок kinds — от главного: первым идёт то, о чём просят прямо. guess — вид не назван,
 * а вещь — да: каталог всех видов с названиями, искать по смыслу.
 */
export function itemIntent(text, { userLevel } = {}) {
  const t = String(text ?? '').trim()
  if (!t) return null
  if (!(ASK.test(t) || NUMBER.test(t) || NEXT.test(t) || ABOUT.test(t))) return null

  const kinds = []
  const has = (k) => KIND[k].test(t)
  if (has('live')) kinds.push('live')
  if (has('homework')) kinds.push('homework')
  if (has('workbook')) kinds.push('workbook')
  if (has('situation')) kinds.push('situation')
  if (has('shadowing')) kinds.push('shadowing')
  if (has('words')) kinds.push('words')
  // Книжка — раньше текстов: «открой книжку в Практике чтения» — про книжку, а «чтение»
  // там только место.
  if (has('book')) kinds.push('book')
  for (const k of ['comic', 'karaoke', 'tale', 'cartoon', 'speedread', 'listen', 'prep', 'pron', 'writing', 'arcade']) {
    if (has(k)) kinds.push(k)
  }
  // «Скорочтение» — тоже «чтение», но тексты у него свои.
  if (has('reading') && !kinds.includes('speedread')) kinds.push('reading')
  // Тема грамматики может оказаться и игрой «Грамматика · игры» — каталог обоих; про
  // игру сказано прямо — она первая.
  if (has('grammar')) kinds.push(...(has('game') ? ['ggame', 'grammar'] : ['grammar', 'ggame']))
  // «Урок» — урок курса, если это не урок раздела со своими уроками: с преподавателем,
  // воркбука, шэдоуинга, предлогов, произношения.
  const OWN_LESSONS = ['live', 'workbook', 'shadowing', 'situation', 'prep', 'pron', 'writing']
  if (has('lesson') && !kinds.some((k) => OWN_LESSONS.includes(k))) kinds.unshift('course')
  if (kinds.length) return { kinds, level: levelOf(t, userLevel) }
  if (OPEN_VERB.test(t) && !QUESTION.test(t) && !NEXT.test(t) && !namesSection(t, SECTION_NAMES) && namesThing(t)) {
    return { kinds: GUESS_KINDS, level: levelOf(t, userLevel), guess: true }
  }
  return null
}

// Метка действия в ответе Луны из истории (AssistantWidget возвращает её туда).
const ACTION_MARK = /\[\[[A-Z_]+ [^\]]+\]\]/

/**
 * Намерение последнего хода разговора. Ответ на уточняющий вопрос Луны («Какую серию —
 * Swimming или Muddy Puddles?» → «про лужи», «вторую») сам на просьбу не похож: ни глагола,
 * ни вида, — и без этого каталога в запросе бы не было, открыть выбранное было бы нечем.
 * Поэтому: последний ход без намерения, прошлый ответ Луны — вопрос без метки действия
 * (с меткой — это «Открыть?», его «да» разбирает resolveItem), а реплика перед ним была
 * просьбой открыть — берём её намерение с пометкой followUp. Только на шаг назад: дальше
 * разговор уже о другом.
 */
export function itemIntentForTurns(messages, opts = {}) {
  const list = Array.isArray(messages) ? messages : []
  const last = list[list.length - 1]
  if (last?.role !== 'user') return null
  const own = itemIntent(last.content, opts)
  if (own) return own
  const reply = list[list.length - 2]
  const before = list[list.length - 3]
  if (reply?.role !== 'assistant' || before?.role !== 'user') return null
  const asked = String(reply.content ?? '')
  if (ACTION_MARK.test(asked) || !asked.includes('?')) return null
  const prev = itemIntent(before.content, opts)
  return prev ? { ...prev, followUp: true } : null
}
