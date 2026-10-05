// Чистая логика онбординга SAT (Figma SAT, главы 3–6) и шапки хаба: цель по секциям, куда она попадает
// относительно middle-50% вузов, статус даты экзамена и доли доменов. Правила — из прототипа jts-sat-platform
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

/**
 * Где цель относительно middle-50% вуза: in — внутри, above — выше, near — до 70 ниже нижней границы, below — ещё
 * ниже. Это не шанс поступления, и экран так и пишет.
 */
export function collegeBand(target, college) {
  const [lo, hi] = college.midSAT.total
  if (target >= lo && target <= hi) return 'in'
  if (target > hi) return 'above'
  return lo - target <= NEAR_BELOW ? 'near' : 'below'
}

/** Вузы по тому, куда падает цель: сперва достижимые (в диапазоне, выше, чуть ниже), потом остальные; test-blind нет. */
export function rankColleges(target, colleges) {
  const order = { in: 0, above: 1, near: 2, below: 3 }
  return colleges
    .filter((c) => c.testPolicy !== 'blind')
    .map((c) => ({ ...c, band: collegeBand(target, c), gap: target - c.midSAT.total[0] }))
    .sort((a, b) => order[a.band] - order[b.band] || b.midSAT.total[0] - a.midSAT.total[0])
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
