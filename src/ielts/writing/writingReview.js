// Экран разбора работы Writing (ТЗ §9.4, workView прототипа): чистые правила без React — где в тексте стоят пометки
// ошибок, какие ограничения показать баннером и какие тренировки предложить под слабые критерии.
// Старые работы (до 11.2026: ошибки { quote, issue, correction }, без para и quoteFound) читаются тем же кодом.

import { CRITERIA } from './writing.js'

// критерий → короткий ключ цвета и подписи (TA фиолетовый, CC бирюзовый, LR оранжевый, GRA розовый)
export const CRIT_CODE = { taskResponse: 'ta', coherenceCohesion: 'cc', lexicalResource: 'lr', grammaticalRange: 'gra' }

// коды ограничений бэкенда (result.caps) в порядке показа; незнакомый код баннером не рисуется
export const CAP_ORDER = ['off_topic', 'too_short', 'under_length', 'no_overview', 'copied_intro']

export function capBanners(caps) {
  const list = Array.isArray(caps) ? caps : []
  return CAP_ORDER.filter((c) => list.includes(c))
}

/** Ошибка любого формата → поля карточки. */
export function errorView(e) {
  return {
    quote: String(e?.quote || ''),
    criterion: CRITERIA.includes(e?.criterion) ? e.criterion : 'grammaticalRange',
    type: String(e?.type || ''),
    para: Number(e?.para) || 0,
    why: String(e?.why || e?.issue || ''),
    fix: String(e?.fix || e?.correction || ''),
    rule: String(e?.rule || ''),
  }
}

/**
 * Пометки ошибок по абзацам: для каждого абзаца — куски [{ text } | { text, i }], где i — номер ошибки в списке.
 * Ошибка ставится в свой абзац (para), иначе в первый, где есть цитата; пересекающиеся цитаты не ставятся — такая
 * ошибка, как и ненайденная (quoteFound: false), показывается общим замечанием. placed — номера поставленных.
 */
export function annotate(paras, errors) {
  const placed = new Set()
  const spans = paras.map(() => [])
  const list = (errors || []).map(errorView)
  const tryPlace = (pi, e, i) => {
    const at = paras[pi].indexOf(e.quote)
    if (at < 0) return false
    const end = at + e.quote.length
    if (spans[pi].some((s) => at < s.b && end > s.a)) return false
    spans[pi].push({ a: at, b: end, i })
    placed.add(i)
    return true
  }
  list.forEach((e, i) => {
    if (!e.quote.trim() || errors[i]?.quoteFound === false) return
    if (e.para >= 1 && e.para <= paras.length && tryPlace(e.para - 1, e, i)) return
    for (let pi = 0; pi < paras.length; pi++) if (pi !== e.para - 1 && tryPlace(pi, e, i)) return
  })
  const parts = paras.map((p, pi) => {
    const out = []
    let pos = 0
    for (const s of spans[pi].sort((x, y) => x.a - y.a)) {
      if (s.a > pos) out.push({ text: p.slice(pos, s.a) })
      out.push({ text: p.slice(s.a, s.b), i: s.i })
      pos = s.b
    }
    if (pos < p.length) out.push({ text: p.slice(pos) })
    return out
  })
  return { parts, placed }
}

// Критерий → тренировки (crit2drills банка тренировок, drills-bank.json): id дрилла — «WD-» + ключ.
export const CRIT_DRILLS = {
  taskResponse: ['T1-OVERVIEW', 'T1-FEATURES', 'T2-PLAN', 'T2-RELEVANT', 'T2-TYPE', 'GT-PURPOSE', 'GT-LETTER'],
  coherenceCohesion: ['T1-TPL', 'T2-TPL', 'T2-PARA', 'T2-LINK', 'T1-ORDER', 'GT-TPL'],
  lexicalResource: ['T1-TREND', 'T1-NOUN', 'T1-APPROX', 'T2-ACADEMIC', 'T2-PARAPHRASE'],
  grammaticalRange: ['T1-ERRORS', 'T1-FUTURE', 'T1-PROCESS', 'T2-COMPLEX'],
}

// вид задания (kindKey) → часть тренировок
const PART = { t1ac: 'T1', t1gt: 'GT', t2: 'T2' }

/**
 * Тренировки под слабые места: критерии ниже 6.5, самый слабый первым, только тренировки своей части (Task 1
 * Academic / письмо GT / Task 2). available — id дриллов, которые есть в банке (null — не проверять).
 */
export function weakDrills(criteria, kind, available = null, max = 5) {
  if (!criteria) return []
  const part = PART[kind] || 'T2'
  const weak = CRITERIA.filter((k) => Number(criteria[k]) < 6.5).sort((a, b) => Number(criteria[a]) - Number(criteria[b]))
  const out = []
  for (const k of weak)
    for (const key of CRIT_DRILLS[k]) {
      const id = `WD-${key}`
      if (key.startsWith(`${part}-`) && !out.includes(id) && (!available || available.has(id))) out.push(id)
    }
  return out.slice(0, max)
}

/** Категория задания для фильтра тренировок по типу (ty) и главы гида. */
export const taskCategory = (doc) => doc?.visual || doc?.register || doc?.essayType || doc?.category || null
