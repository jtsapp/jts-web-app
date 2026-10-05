// Ответ «вписать число» (SPR / grid-in) Digital SAT — порт JTS.spr из прототипа jts-sat-platform (js/core.js).
// На клиенте нужен только для проверки ФОРМАТА до отправки (экран 27 Figma: «ошибка формата — до проверки, а не
// после»); верность ответа решает сервер, ключей у экрана нет. check() оставлен ради теста-оракула и бэкенда:
// правила эквивалентности (дробь = десятичная, допуск 1e-6) обязаны совпасть в трёх местах.

export function normalize(raw) {
  return String(raw === undefined || raw === null ? '' : raw)
    .trim()
    .replace(/\s+/g, '')
    .replace(/[−–—]/g, '-') // юникодный минус и тире
    .replace(/^\+/, '')
}

/** Нормализованная строка → число; null, если это не число. */
export function value(norm) {
  if (!norm) return null
  const m = norm.match(/^(-?)(\d+)\/(\d+)$/)
  if (m) {
    const den = Number(m[3])
    if (!den) return null
    return (m[1] ? -1 : 1) * (Number(m[2]) / den)
  }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(norm)) return Number(norm)
  return null
}

/**
 * Проверка формата по правилам ввода Digital SAT, без верности: пусто, символы (% $ ,), смешанная дробь «3 1/2»,
 * длина (5 знаков, 6 с минусом), не число. Коды — ключи подсказки под полем.
 */
export function validate(raw) {
  const s = String(raw === undefined ? '' : raw).trim()
  if (!s) return { ok: false, code: 'empty' }
  if (/[%$,]/.test(s)) return { ok: false, code: 'symbol' }
  if (/\d\s+\d/.test(s)) return { ok: false, code: 'mixed' }
  const n = normalize(s)
  const limit = n[0] === '-' ? 6 : 5
  if (n.length > limit) return { ok: false, code: 'length' }
  if (value(n) === null) return { ok: false, code: 'format' }
  return { ok: true, normalized: n, value: value(n) }
}

/** Совпадает ли ответ с одной из принятых форм (`answer` вопроса — список эквивалентов). */
export function check(raw, answers) {
  const list = Array.isArray(answers) ? answers : [answers]
  const n = normalize(raw)
  if (!n) return false
  const v = value(n)
  for (const a of list) {
    const an = normalize(a)
    if (an === n) return true
    const av = value(an)
    if (v !== null && av !== null && Math.abs(v - av) <= 1e-6 * Math.max(1, Math.abs(av))) return true
  }
  return false
}
