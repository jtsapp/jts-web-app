// Проверка ответа в разделе SAT Math.
//
// Вопрос с вариантами сверяется по букве. Вопрос с вводом — по правилам
// Bluebook (student-produced response): дробь и десятичная запись одного
// числа равноценны, а бесконечную дробь можно ввести десятичной, обрезав или
// округлив до трёх и более знаков (19/24 → 0.791 или 0.792). Ключ книги
// перечисляет только часть таких форм, поэтому сверяем числом, а не строкой.
//
// Запятая читается как десятичная точка: ученики пишут «0,575» по-русски, а
// разделителей тысяч в поле Bluebook всё равно нет.

const EPS = 1e-9
const MIN_APPROX_DIGITS = 3

/** Строка ученика или ключа → { value, decimals } или null, если это не число. */
export function parseNumber(raw) {
  if (raw == null) return null
  const s = String(raw).trim().replace(/\s+/g, '').replace(/−/g, '-').replace(/,/g, '.')
  if (!s) return null
  const frac = s.match(/^(-?)(\d+)\/(\d+)$/)
  if (frac) {
    const den = Number(frac[3])
    if (den === 0) return null
    const v = Number(frac[2]) / den
    return { value: frac[1] ? -v : v, decimals: null }
  }
  const dec = s.match(/^(-?)(\d*)\.?(\d*)$/)
  if (!dec || (!dec[2] && !dec[3])) return null
  return { value: Number(s), decimals: dec[3].length }
}

function sameNumber(a, b) {
  return Math.abs(a - b) < EPS
}

// Десятичная запись ученика годится для бесконечного (или длинного) ответа,
// если в ней не меньше трёх знаков и она совпадает с обрезанным или
// округлённым значением. Точный ответ, который помещается в эти знаки
// (22.75), так не «угадывается»: 22.749 — уже другое число.
function approximates(input, exact) {
  const d = input.decimals
  if (d == null || d < MIN_APPROX_DIGITS) return false
  const k = 10 ** d
  const rounded = Math.round(exact * k) / k
  if (sameNumber(rounded, exact)) return false
  const truncated = Math.trunc(exact * k) / k
  return sameNumber(input.value, rounded) || sameNumber(input.value, truncated)
}

/** true, если ответ ученика засчитывается для вопроса из units.json. */
export function checkAnswer(question, input) {
  if (!question) return false
  if (question.format === 'mcq') return String(input || '').trim().toUpperCase() === question.answer
  const got = parseNumber(input)
  if (!got) return false
  return question.answer.some((key) => {
    const want = parseNumber(key)
    if (!want) return false
    return sameNumber(got.value, want.value) || approximates(got, want.value)
  })
}

/** Ответ из ключа для показа после проверки: «C» или «91/4 или 22.75». */
export function formatAnswer(question, orWord) {
  if (question.format === 'mcq') return question.answer
  return question.answer.join(` ${orWord} `)
}
