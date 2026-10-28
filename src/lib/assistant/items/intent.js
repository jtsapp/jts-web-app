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
// \b в JS видит только латиницу, поэтому границы слов — через \p{L} (флаг u).

const w = (src) => new RegExp(src, 'iu')
const NOT_LETTER_BEFORE = '(?<!\\p{L})'
const NOT_LETTER_AFTER = '(?!\\p{L})'

const ASK = w(
  [
    'откр', 'покаж', 'показ', 'включ', 'запуст', 'перейд', 'хочу', 'давай', 'начн', 'начать', 'продолж', 'найд', 'где\\s',
    `${NOT_LETTER_BEFORE}аш(?:ып|ыңыз|шы)?${NOT_LETTER_AFTER}`, 'ашып', 'көрсет', 'қос', 'бастай',
    `${NOT_LETTER_BEFORE}(?:open|show|start|play|continue|find|where|take me|go to)${NOT_LETTER_AFTER}`,
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
  reading: w(`текст|чтени|статью|reading|${NOT_LETTER_BEFORE}text${NOT_LETTER_AFTER}|мәтін|оқылым`),
  grammar: w(
    `грамматик|${NOT_LETTER_BEFORE}тем[уаые]?${NOT_LETTER_AFTER}|правил[оау]|grammar|topic|тақырып|` +
      `${NOT_LETTER_BEFORE}(?:present|past|future|perfect|continuous|passive|conditional|modal|articles?|comparatives?|gerund|infinitive)${NOT_LETTER_AFTER}`,
  ),
  game: w(`${NOT_LETTER_BEFORE}игр\\p{L}*|${NOT_LETTER_BEFORE}games?${NOT_LETTER_AFTER}|ойын`),
  lesson: w('урок|lesson|сабақ'),
}

// Уровень, названный в реплике: «B1», «b1», а кириллицей — «В1», «а2» (так их и печатают).
const LEVEL_RE = /(?<!\p{L})([aаbвcс])([0-2])(?!\d)/iu
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

/**
 * { kinds, level } — что приложить к вопросу, или null, если ученик ни о чём таком не просит.
 * Порядок kinds — от главного: первым идёт то, о чём просят прямо.
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
  if (has('reading')) kinds.push('reading')
  // Тема грамматики может оказаться и игрой «Грамматика · игры» — каталог обоих; про
  // игру сказано прямо — она первая.
  if (has('grammar')) kinds.push(...(has('game') ? ['ggame', 'grammar'] : ['grammar', 'ggame']))
  // «Урок» — урок курса, если это не урок с преподавателем, не воркбук и не шэдоуинг.
  if (has('lesson') && !kinds.some((k) => k === 'live' || k === 'workbook' || k === 'shadowing' || k === 'situation')) {
    kinds.unshift('course')
  }
  return kinds.length ? { kinds, level: levelOf(t, userLevel) } : null
}
