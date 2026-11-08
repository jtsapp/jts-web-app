import { groupByCountry } from './colleges.js'

// Чистая логика онбординга SAT (Figma SAT, главы 3–6) и шапки хаба: цель по секциям, куда она попадает
// относительно данных вузов (middle-50%, порог, ориентир), статус даты экзамена и доли доменов. Правила — из прототипа jts-sat-platform
// (onboarding.js, README «The target score, and where it lands», «Picking the exam date»).

export const SECTION_MIN = 200
export const SECTION_MAX = 800
// Тройка пресетов «Не уверены? Начните с одного из этих» (Figma 3)
export const TARGET_PRESETS = [1220, 1350, 1500]
// «Чуть ниже» — до 70 баллов под нижней границей диапазона вуза (README прототипа)
export const NEAR_BELOW = 70
// «Пока выбираю дату» — план на условные 12 недель (Figma 4)
export const UNDECIDED_WEEKS = 12

const DAY = 86400000

/** Балл секции: не отвергаем, а округляем до 10 и зажимаем в 200–800 — «705» становится 710 (README прототипа). */
export function roundSection(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.min(SECTION_MAX, Math.max(SECTION_MIN, Math.round(n / 10) * 10))
}

/** Пресет итога → секции: поровну, остаток — в Math, всё кратно 10. */
export function splitTotal(total) {
  const half = Math.floor(total / 20) * 10
  return { rw: roundSection(half), math: roundSection(total - half) }
}

// Вуз без Total, но с секциями (Harvard, Caltech): «чуть ниже» — до 30 под нижней границей секции
export const NEAR_BELOW_SECTION = 30
// Запас над порогом (minimum) и ориентиром (full_range): порог — отсечение, а не цель (решения SAT, «тип значения»)
export const MIN_MARGIN = 50

const goalOf = (goal) => (typeof goal === 'number' ? { total: goal, rw: null, math: null } : { ...goal, total: goal.rw + goal.math })
const bandIn = (v, [lo, hi], near) => {
  if (v >= lo && (hi == null || v <= hi)) return 'in'
  if (v > hi) return 'above'
  return lo - v <= near ? 'near' : 'below'
}
const WORST = ['below', 'near', 'in', 'above']

/**
 * Где цель относительно данных вуза. middle_50: in / above / near (до 70 ниже нижней границы) / below; без Total —
 * по каждой секции, берётся худшая (Total из суммы секций не считаем). minimum и full_range: pass — не ниже порога или
 * ориентира, near, below. null — сравнивать не с чем (балл не публикуется). Это не шанс поступления.
 * goal — {rw, math} или число-итог.
 */
export function collegeBand(goal, college) {
  const s = college.score
  if (!s) return null
  const g = goalOf(goal)
  if (s.type === 'middle_50') {
    if (s.total) return bandIn(g.total, s.total, NEAR_BELOW)
    const parts = ['rw', 'math'].filter((k) => s[k])
    if (!parts.length || parts.some((k) => g[k] == null)) return null
    return parts.map((k) => bandIn(g[k], s[k], NEAR_BELOW_SECTION)).sort((a, b) => WORST.indexOf(a) - WORST.indexOf(b))[0]
  }
  if (!s.total) return null
  const lo = s.total[0]
  if (g.total >= lo) return 'pass'
  return lo - g.total <= NEAR_BELOW ? 'near' : 'below'
}

/**
 * «В досягаемости»: middle_50 — цель не ниже нижней границы Total (без Total — каждой секции), minimum — не ниже порога,
 * full_range — не ниже ориентира. «Чуть ниже» не считается. Вуз без балла не входит ни в N, ни в M.
 */
export const inReach = (band) => band === 'in' || band === 'above' || band === 'pass'

export function reachSummary(goal, colleges) {
  const bands = colleges.map((c) => collegeBand(goal, c)).filter(Boolean)
  return { n: bands.filter(inReach).length, total: bands.length }
}

/**
 * Вузы ОДНОЙ страны по тому, куда падает цель: достижимые, чуть ниже, ниже, без балла. Внутри — по нижней границе.
 * Списки разных стран сюда вместе не передавать: баллы несравнимы (rankByCountry делит сам).
 */
export function rankColleges(goal, colleges) {
  const order = { in: 0, above: 0, pass: 0, near: 1, below: 2 }
  const g = goalOf(goal)
  return colleges
    .filter((c) => c.testPolicy !== 'blind')
    .map((c) => {
      const band = collegeBand(goal, c)
      const lo = c.score?.total?.[0] ?? null
      return { ...c, band, gap: lo == null ? null : g.total - lo }
    })
    .sort((a, b) => (order[a.band] ?? 3) - (order[b.band] ?? 3) || (b.score?.total?.[0] ?? -1) - (a.score?.total?.[0] ?? -1))
}

/** Группы по стране (порядок чипов), каждая отсортирована сама по себе. */
export function rankByCountry(goal, colleges) {
  return groupByCountry(colleges).map(({ country, rows }) => ({ country, rows: rankColleges(goal, rows) }))
}

/**
 * Какую цель подставить по вузу: middle_50 — верхняя граница Total (без Total — верх каждой секции), minimum и
 * full_range — порог (верхняя полоса, если полос несколько) плюс MIN_MARGIN. Без балла — null.
 */
export function suggestGoal(college) {
  const s = college.score
  if (!s) return null
  if (s.type === 'middle_50') {
    if (s.total) return splitTotal(s.total[1])
    if (s.rw && s.math) return { rw: roundSection(s.rw[1]), math: roundSection(s.math[1]) }
    return null
  }
  if (!s.total) return null
  const base = s.total[1] ?? s.total[0]
  return splitTotal(Math.min(SECTION_MAX * 2, Math.ceil((base + MIN_MARGIN) / 10) * 10))
}

/**
 * Диапазон test-optional смещён вверх: балл прислали те, кому он помогал. Признак — политика «по желанию» или меньше
 * половины зачисленных прислали тест (Stanford Fall 2023 — 47%).
 */
export function isSkewed(college) {
  if (college.score?.type !== 'middle_50') return false
  return college.testPolicy === 'optional' || (college.submittedPct != null && college.submittedPct < 50)
}

const dayStart = (d) => {
  const x = new Date(d)
  return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())
}
const isoDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function daysUntil(iso, today = new Date()) {
  return Math.round((isoDay(iso) - dayStart(today)) / DAY)
}

/**
 * Статус даты экзамена для листка календаря (Figma 4): open — регистрация идёт (до обычного дедлайна), late —
 * осталась поздняя регистрация, closed — закрыта (дата видна: ученик мог уже зарегистрироваться), past — прошла.
 * Ожидаемые даты (confirmed=false) без дедлайнов — expected.
 */
export function dateStatus(d, today = new Date()) {
  const days = daysUntil(d.testDate, today)
  if (days < 0) return { status: 'past', days, weeks: 0, regDays: null }
  const weeks = Math.max(0, Math.round(days / 7))
  if (!d.confirmed || !d.registrationDeadline) return { status: 'expected', days, weeks, regDays: null }
  const reg = daysUntil(d.registrationDeadline, today)
  if (reg >= 0) return { status: 'open', days, weeks, regDays: reg }
  const late = d.lateDeadline ? daysUntil(d.lateDeadline, today) : -1
  if (late >= 0) return { status: 'late', days, weeks, regDays: late }
  return { status: 'closed', days, weeks, regDays: null }
}

/** Даты для выбора: прошедшие уходят сами (README прототипа), порядок — по дате. */
export function upcomingDates(dates, today = new Date()) {
  return dates
    .filter((d) => daysUntil(d.testDate, today) >= 0)
    .sort((a, b) => (a.testDate < b.testDate ? -1 : 1))
    .map((d) => ({ ...d, ...dateStatus(d, today) }))
}

/**
 * Доли доменов секции и навыки в них — из таксономии (как в прототипе: глава учит тем же процентам, что считает
 * планировщик). Доля — вес домена от веса секции, проценты в сумме ровно 100.
 */
export function domainShares(taxonomy, section) {
  const domains = taxonomy.domains.filter((d) => d.section === section).sort((a, b) => a.order - b.order)
  const skills = taxonomy.skills.filter((s) => s.section === section)
  const total = skills.reduce((a, s) => a + s.examWeight, 0) || 1
  const raw = domains.map((d) => {
    const own = skills.filter((s) => s.domain === d.id)
    return { ...d, weight: own.reduce((a, s) => a + s.examWeight, 0) / total, skills: own }
  })
  // округление «наибольшим остатком»: иначе 26+28+20+26 могло бы дать 99 или 101
  const floors = raw.map((d) => Math.floor(d.weight * 100))
  let left = 100 - floors.reduce((a, b) => a + b, 0)
  const order = raw.map((d, i) => [d.weight * 100 - floors[i], i]).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) if (left-- > 0) floors[i]++
  return raw.map((d, i) => ({ ...d, percent: floors[i] }))
}

/** Текст пункта главы: ведущий <b>…</b> — заголовок карточки, остальное — тело (Figma: «Две секции» + пояснение). */
export function splitLead(html) {
  const m = String(html || '').match(/^\s*<b>(.*?)<\/b>\s*(.*)$/s)
  if (!m) return { title: null, body: html }
  // «<b>Desmos встроен</b> и доступен…» — выделение внутри фразы, а не заголовок: оторвав его, оставили бы текст со
  // строчной буквы («и доступен всю секцию»). Такая фраза остаётся целой, заголовок берётся из макета.
  if (/^\p{Ll}/u.test(m[2])) return { title: null, body: html }
  return { title: m[1].replace(/[.:]\s*$/, ''), body: m[2] }
}

/** Значение на языке интерфейса: строка как есть, объект {en,ru,kk} — по языку с откатом на ru, затем en. */
export function pick(v, lang) {
  if (v == null || typeof v !== 'object') return v
  return v[lang] ?? v.ru ?? v.en ?? ''
}
