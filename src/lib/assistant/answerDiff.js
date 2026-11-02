// Чем ответ ученика отличается от эталона — по словам, как считает проверка сайта: регистр,
// пунктуация и сокращения («I've» = «I have») не отличие. Модель сама сравнивала «посимвольно»
// и записала «I have» вместо «I've» в ошибку (жалоба 02.11.2026), поэтому разницу считает код.

import { toks } from '../../practice/listen/compare.js'

/** [{from, to}] — заменённые, пропущенные (from: '') и лишние (to: '') слова; [] — по словам совпадает. */
export function answerDiff(given, expected) {
  const a = toks(given)
  const b = toks(expected)
  // Наибольшая общая подпоследовательность слов: короткие ответы, таблица маленькая.
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
    }
  }
  const out = []
  let i = 0
  let j = 0
  let from = []
  let to = []
  const flush = () => {
    if (from.length || to.length) out.push({ from: from.join(' '), to: to.join(' ') })
    from = []
    to = []
  }
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush()
      i++
      j++
    } else if (j < b.length && (i >= a.length || L[i][j + 1] >= L[i + 1][j])) {
      to.push(b[j++])
    } else {
      from.push(a[i++])
    }
  }
  flush()
  return out
}

const GIVEN = /ученик ввёл «([^»]*)»/g
const EXPECTED = /\[верный ответ по заданию: «([^»]*)»\]/g

/**
 * Строка для модели о разнице ответа и эталона — или null, если сравнивать нечего или неоднозначно
 * (на экране несколько полей или несколько эталонов: какое к какому — код не знает).
 */
export function answerDiffNote(screenText) {
  const text = String(screenText || '')
  const given = [...text.matchAll(GIVEN)].map((m) => m[1])
  const expected = [...text.matchAll(EXPECTED)].map((m) => m[1])
  if (given.length !== 1 || expected.length !== 1) return null
  const diff = answerDiff(given[0], expected[0])
  if (!diff.length) {
    return 'Код сравнил ответ ученика с эталоном: по словам они совпадают (регистр, знаки и сокращения вроде «I\'ve» = «I have» не отличие). Не называй ошибок в словах.'
  }
  const list = diff
    .map((d) => (d.from && d.to ? `«${d.from}» → «${d.to}»` : d.to ? `пропущено «${d.to}»` : `лишнее «${d.from}»`))
    .join('; ')
  return `Код сравнил ответ ученика с эталоном (регистр, знаки и сокращения вроде «I've» = «I have» уже учтены). Отличия только такие: ${list}. Других ошибок нет — не называй их.`
}
