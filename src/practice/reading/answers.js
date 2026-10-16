// Ключ упражнения одной строкой — для помощника по сайту (data-assistant-expected на итоге упражнения). Помощник видит
// экран текстом, а верный ответ механики показывают по-разному: выбор — подсветкой кнопки, пропуск — словом в поле,
// порядок — строкой под заданием, а «соедини пары» после проверки верных пар не показывает вовсе, только отметки
// «верно / неверно». Без ключа помощник угадывал бы, что задание считало верным.

import { choiceItems, gapParts, isChoice, isMatch, isOrder } from './engine.js'
import { loc } from './loc.js'

// Снимок экрана берёт из эталона 800 знаков (EXPECTED_MAX_CHARS в lib/assistant/screenSnapshot.js). Пересказ из
// шести-восьми длинных предложений бывает и длиннее, и обрезка съедала бы как раз последние пункты — поэтому пункт
// порядка укорачивается по словам: предложение узнаётся по началу, а целиком верный порядок и так стоит на экране.
const ORDER_BUDGET = 760

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

function clipWords(s, max) {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, '')}…`
}

// Эмодзи пары «слово ↔ картинка» дописываем подписью из данных (та же, что у кнопки для скринридера): «🍯» без неё
// помощнику пришлось бы толковать самому. Подпись, совпавшая со словом слева (английский интерфейс), лишняя.
function rightSide(p, lang) {
  const r = clean(loc(p.r, lang))
  const alt = clean(loc(p.alt, lang))
  if (!alt || alt === r || alt.toLowerCase() === clean(loc(p.l, lang)).toLowerCase()) return r
  return `${r} (${alt})`
}

/**
 * Верные ответы упражнения строкой: «1) good to eat; 2) Правда», «honey → 🍯 (мёд); …», «1. …; 2. …».
 *
 * @param ex      упражнение из данных уровня
 * @param labels  подписи кнопок true/false — те же, что на экране ({ yes, no, notGiven })
 * @param lang    язык интерфейса: заголовки абзацев и подписи эмодзи в данных переведены
 * @returns строка ключа или '' — у «мнения» ключа нет, его проверяют по ключевым идеям
 */
export function exerciseAnswers(ex, labels, lang) {
  if (isChoice(ex.type)) {
    return choiceItems(ex, labels)
      .map((it, k) => `${k + 1}) ${clean(it.o[it.a])}`)
      .join('; ')
  }
  if (isMatch(ex.type)) {
    return ex.pairs.map((p) => `${clean(loc(p.l, lang))} → ${rightSide(p, lang)}`).join('; ')
  }
  if (ex.type === 'gap') {
    return gapParts(ex)
      .answers.map((a, k) => `${k + 1}) ${clean(a)}`)
      .join('; ')
  }
  if (isOrder(ex.type)) {
    const per = Math.floor(ORDER_BUDGET / Math.max(1, ex.items.length)) - 5
    return ex.items.map((s, k) => `${k + 1}. ${clipWords(clean(s), per)}`).join('; ')
  }
  return ''
}
