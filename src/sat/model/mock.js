// Пробники SAT (фаза 7): то, что экрану нужно посчитать самому, — подписи модулей, длительности, шкала траектории,
// фильтр разбора. Правила прохождения (набор, маршрут, диапазон) живут на бэкенде (SatMockRules); здесь их нет.

/** Форма экзамена для показа до старта (Figma 16): блоки модулей и перерыв. Совпадает с SatMockRules.STRUCTURE. */
export const MOCK_BLOCKS = [
  { key: 'rw1', section: 'rw', n: 1, minutes: 32, count: 27 },
  { key: 'rw2', section: 'rw', n: 2, minutes: 32, count: 27 },
  { key: 'break', section: null, minutes: 10 },
  { key: 'm1', section: 'math', n: 1, minutes: 35, count: 22 },
  { key: 'm2', section: 'math', n: 2, minutes: 35, count: 22 },
]

/** Пробник и симуляция идут только на широком экране (правило прототипа mockMinWidth). */
export const MOCK_MIN_WIDTH = 1024

export const TOTAL_MINUTES = MOCK_BLOCKS.reduce((s, b) => s + b.minutes, 0)

/** Номер модуля в секции: rw2 → 2. */
export function moduleNo(key) {
  return Number(String(key).slice(-1)) || 1
}

/** «2 ч 16 мин» / «1 ч» / «45 мин» — по словарю (ключи sat.mock.hm / sat.mock.h / sat.mock.m). */
export function hoursMinutes(t, totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(m / 60)
  if (!h) return t('sat.mock.m', { m: String(m) })
  // ровный час — «1 ч», а не «1 ч 0 мин»
  return m % 60 ? t('sat.mock.hm', { h: String(h), m: String(m % 60) }) : t('sat.mock.h', { h: String(h) })
}

/** mm:ss из секунд. */
export function clock(sec) {
  const s = Math.max(0, Math.round(sec || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** m:ss без ведущего нуля — время на вопросе в разборе (Figma 34: «1:48»). */
export function shortClock(sec) {
  const s = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Середина диапазона — по ней сравниваются попытки: сам диапазон шире любой разницы между ними. */
export function mid(range) {
  return range && range.low != null ? (range.low + range.high) / 2 : null
}

/**
 * Изменение к прошлой сданной симуляции (столбец Δ, Figma 16) — по середине диапазона. runs — новые первыми, как
 * отдаёт бэкенд; у самой старой — null.
 */
export function deltas(runs) {
  return runs.map((r, i) => {
    const prev = runs[i + 1]
    const a = mid(r.total)
    const b = prev ? mid(prev.total) : null
    return a == null || b == null ? null : Math.round(a - b)
  })
}

/**
 * Шкала траектории (Figma 16): границы по сотням вокруг диапазонов и цели, не меньше трёх делений. Точки — по
 * порядку попыток слева направо (старые слева).
 */
export function trajectory(runs, target) {
  const pts = runs.filter((r) => r.total && r.finishedAt).slice().reverse()
  const values = pts.flatMap((r) => [r.total.low, r.total.high])
  if (target) values.push(target)
  if (!values.length) return null
  let lo = Math.floor((Math.min(...values) - 20) / 100) * 100
  let hi = Math.ceil((Math.max(...values) + 20) / 100) * 100
  while (hi - lo < 300) {
    if (lo > 400) lo -= 100
    else hi += 100
  }
  lo = Math.max(400, lo)
  hi = Math.min(1600, hi)
  // шаг 100 на всю шкалу — 13 подписей вплотную (симуляция на 500 и цель 1500); шире 600 — шаг 200, до семи подписей
  const step = hi - lo <= 600 ? 100 : 200
  if ((hi - lo) % step) {
    hi = Math.min(1600, lo + Math.ceil((hi - lo) / step) * step)
    lo = hi - Math.ceil((hi - lo) / step) * step
  }
  const ticks = []
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  return { lo, hi, ticks, points: pts }
}

/** Доля верных секции для полоски карточки итога (Figma 33). */
export function share(section) {
  return section && section.total ? section.correct / section.total : 0
}

/** Положение на шкале 400–1600 в процентах — для полосы итога. */
export function onScale(v) {
  return Math.max(0, Math.min(100, ((v - 400) / 1200) * 100))
}

/** Вопрос без ответа — ответ пуст. */
export function unanswered(item) {
  return item.given == null || String(item.given).trim() === ''
}

/**
 * Фильтр разбора (Figma 34): все / неверные (с неотвеченными — неотвеченный стоит столько же, сколько неверный) /
 * отмеченные. Возвращает плоский список { item, module } в порядке экзамена.
 */
export function reviewList(modules, filter) {
  const out = []
  for (const m of modules || []) {
    for (const it of m.items || []) {
      if (filter === 'wrong' && it.correct) continue
      if (filter === 'marked' && !it.marked) continue
      out.push({ item: it, module: m })
    }
  }
  return out
}
