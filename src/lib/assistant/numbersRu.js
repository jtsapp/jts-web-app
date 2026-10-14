// Числа словами для озвучки русской фразы голосом Луны. Луна в звонке говорит
// Gemini с языком en-US (плагин google агента по умолчанию), и помощник обязан
// звучать так же — но тогда цифры Gemini читает по-английски: «0%» — «zero
// percent» (живой прогон 14.10.2026). Слова он читает по-русски, поэтому
// фраза уходит в синтез с числами словами. Текст в окне чата не меняется.
//
// Падежей нет — именительный падеж, мужской род («двадцать один урок»): для
// процентов, минут и баллов этого хватает, а полная грамматика числительных
// не окупится. Цифры, прилипшие к латинице (A2, B1, IELTS-коды), не трогаем:
// уровень читают как есть.

const ONES = ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
const ONES_F = ['ноль', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
const TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
const HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот']

/** Форма слова после числа: 1 процент, 2 процента, 5 процентов. */
export function plural(n, [one, few, many]) {
  const d = n % 10
  const dd = n % 100
  if (dd >= 11 && dd <= 14) return many
  if (d === 1) return one
  if (d >= 2 && d <= 4) return few
  return many
}

function triad(n, feminine = false) {
  const words = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h) words.push(HUNDREDS[h])
  if (rest >= 10 && rest < 20) words.push(TEENS[rest - 10])
  else {
    const t = Math.floor(rest / 10)
    const o = rest % 10
    if (t) words.push(TENS[t])
    if (o) words.push((feminine ? ONES_F : ONES)[o])
  }
  return words
}

/** Целое число словами (до миллиардов), именительный падеж. */
export function numberToRu(n) {
  n = Math.floor(Math.abs(Number(n) || 0))
  if (n === 0) return 'ноль'
  const words = []
  const millions = Math.floor(n / 1_000_000) % 1000
  const thousands = Math.floor(n / 1000) % 1000
  const units = n % 1000
  if (millions) words.push(...triad(millions), plural(millions, ['миллион', 'миллиона', 'миллионов']))
  if (thousands) words.push(...triad(thousands, true), plural(thousands, ['тысяча', 'тысячи', 'тысяч']))
  if (units) words.push(...triad(units))
  return words.join(' ')
}

const TIME_RE = /(\d{1,2}):(\d{2})(?![0-9])/g
const PERCENT_RE = /(\d+)\s?%/g
const DECIMAL_RE = /(\d+)[.,](\d+)(?![0-9A-Za-z])/g
const INT_RE = /(\d+)(?![0-9A-Za-z])/g

// Сосед слева, при котором число не трогаем (A2, v1.5). Не lookbehind
// `(?<!…)`: Safari до 16.4 такой литерал не разбирает и роняет весь модуль
// (safariSyntax.test.js), поэтому соседа смотрим в колбэке по смещению. Пропуск
// совпадения целиком ничего не теряет: левее любой его внутренней позиции стоит
// цифра, «:», «.» или «,» — lookbehind отверг бы и её.
const STUCK = /[A-Za-z0-9.,:]/

function spellAll(text, re, say) {
  return text.replace(re, (...m) => {
    const offset = m[m.length - 2]
    const whole = m[m.length - 1]
    return offset > 0 && STUCK.test(whole[offset - 1]) ? m[0] : say(...m.slice(1, -2))
  })
}

const minutes = (mm) => (mm === '00' ? 'ноль ноль' : mm[0] === '0' ? `ноль ${ONES[Number(mm[1])]}` : numberToRu(Number(mm)))

/** Русская фраза с числами словами — для синтеза голосом Луны. */
export function spellNumbersRu(text) {
  let s = String(text ?? '')
  s = spellAll(s, TIME_RE, (h, mm) => `${numberToRu(Number(h))} ${minutes(mm)}`)
  s = spellAll(s, PERCENT_RE, (n) => `${numberToRu(Number(n))} ${plural(Number(n), ['процент', 'процента', 'процентов'])}`)
  s = spellAll(s, DECIMAL_RE, (a, b) => `${numberToRu(Number(a))} и ${numberToRu(Number(b))}`)
  return spellAll(s, INT_RE, (n) => numberToRu(Number(n)))
}
