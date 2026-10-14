// План SAT на экране (Figma SAT 10, 12–14). Строит и пересобирает план сервер (SatPlanner, бэкенд) — здесь только то,
// что нужно показать: сводка времени до сборки (Figma 10), фазы по неделям, «следующее» занятие, сетка месяца.
// Правила недель повторяют SatPlanner один в один, чтобы сводка «10 недель · 38 занятий» до сборки совпала с планом
// после неё; расхождение ловит plan.test.js на том же примере Figma, что и SatPlannerTest.

export const PHASES = [
  { id: 1, key: 'diagnostic', share: 0 },
  { id: 2, key: 'foundations', share: 0.22 },
  { id: 3, key: 'deep', share: 0.28 },
  { id: 4, key: 'timed', share: 0.2 },
  { id: 5, key: 'mocks', share: 0.17 },
  { id: 6, key: 'refinement', share: 0.08 },
]

export const PROVISIONAL_WEEKS = 12
export const MINUTES = [30, 60, 90, 120]

const DAY = 86400000

/** Дата → «ГГГГ-ММ-ДД» по местному календарю (не UTC: в Алматы UTC-дата вечером была бы уже завтрашней). */
export function iso(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** «ГГГГ-ММ-ДД» → полночь этой даты по местному времени. */
export function parse(s) {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  return x
}

/** Понедельник недели, в которой лежит дата. */
export function monday(d) {
  const dow = (d.getDay() + 6) % 7
  return addDays(d, -dow)
}

/** Номер дня недели 1 (пн) … 7 (вс). */
export function dow(d) {
  return ((d.getDay() + 6) % 7) + 1
}

function daysBetween(a, b) {
  return Math.round((parse(iso(b)) - parse(iso(a))) / DAY)
}

/** Недель от понедельника этой недели до экзамена; без даты — условные 12 (SatPlanner.horizonWeeks). */
export function horizonWeeks(today, examDate) {
  if (!examDate) return PROVISIONAL_WEEKS
  const days = daysBetween(today, parse(examDate))
  return Math.max(1, Math.min(40, Math.ceil(days / 7)))
}

/** Фаза недели (с нуля) из totalWeeks: доли фаз 2–6, диагностика — «неделя 0» (SatPlanner.phaseForWeek). */
export function phaseForWeek(weekIndex, totalWeeks) {
  const sum = PHASES.reduce((s, p) => s + p.share, 0)
  let acc = 0
  for (const p of PHASES) {
    if (!p.share) continue
    acc += p.share / sum
    if ((weekIndex + 1) / totalWeeks <= acc + 1e-9) return p.id
  }
  return 6
}

export function phaseKey(id) {
  return PHASES.find((p) => p.id === id)?.key || 'foundations'
}

/** Интенсивность по минутам в неделю — её не спрашивают, она выводится (Figma 10, шкала из трёх). */
export function intensity(days, minutes) {
  const weekly = days * minutes
  if (weekly < 180) return 'light'
  if (weekly <= 420) return 'standard'
  return 'intensive'
}

/**
 * Сводка до сборки (Figma 10 «ИТОГ»): недель, занятий, дата экзамена. Занятия — в выбранные дни от сегодня и до дня
 * экзамена (не включая его), как их поставит сервер.
 */
export function summarize(today, examDate, days, minutes) {
  const weeks = horizonWeeks(today, examDate)
  const start = monday(today)
  const t = iso(today)
  let lessons = 0
  for (let w = 0; w < weeks; w++) {
    for (const d of days) {
      const date = iso(addDays(start, w * 7 + d - 1))
      if (date < t) continue
      if (examDate && date >= examDate) continue
      lessons++
    }
  }
  return { weeks, lessons, weekly: days.length * minutes, intensity: intensity(days.length, minutes) }
}

/** Все занятия плана подряд. */
export function allLessons(plan) {
  return (plan?.weeks || []).flatMap((w) => w.lessons.map((l) => ({ ...l, week: w.index })))
}

/** Следующее занятие: ближайшее несделанное с сегодняшнего дня (сегодняшнее — первым). */
export function nextLesson(plan, todayIso) {
  return allLessons(plan)
    .filter((l) => (l.status === 'planned' || l.status === 'moved') && l.date >= todayIso)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0] || null
}

/** Статус для легенды Figma 13: выполнено · следующее · запланировано · пропущено · перенесено. */
export function shownStatus(lesson, next) {
  if (lesson.status === 'done') return 'done'
  if (lesson.status === 'skipped') return 'skipped'
  if (next && lesson.id === next.id) return 'next'
  if (lesson.status === 'moved') return 'moved'
  return 'planned'
}

export function progress(plan) {
  const all = allLessons(plan)
  const done = all.filter((l) => l.status === 'done').length
  return { done, total: all.length, pct: all.length ? Math.round((done * 100) / all.length) : 0 }
}

/** Отрезки фаз по неделям плана для роудмапа и полосы фаз (Figma 12–13): { phase, from, to } — недели с 1. */
export function phaseRanges(plan) {
  const out = []
  for (const w of plan?.weeks || []) {
    const n = w.index + 1
    const last = out[out.length - 1]
    if (last && last.phase === w.phase) last.to = n
    else out.push({ phase: w.phase, from: n, to: n })
  }
  return out
}

/** Неделя плана, в которой лежит дата (null — вне плана). */
export function weekOf(plan, dateIso) {
  const m = iso(monday(parse(dateIso)))
  return (plan?.weeks || []).find((w) => w.monday === m) || null
}

/**
 * Сетка месяца (Figma 14): строки-недели с понедельника, в каждой — 7 дней с занятиями этого дня и меткой недели
 * плана, если она есть. Дни соседних месяцев остаются в строке (бледными), чтобы неделя читалась целиком.
 */
export function monthGrid(plan, year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const byDate = new Map()
  for (const l of allLessons(plan)) {
    if (!byDate.has(l.date)) byDate.set(l.date, [])
    byDate.get(l.date).push(l)
  }
  const rows = []
  for (let m = monday(first); m <= last; m = addDays(m, 7)) {
    const mIso = iso(m)
    const week = (plan?.weeks || []).find((w) => w.monday === mIso) || null
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(m, i)
      const dIso = iso(d)
      days.push({ date: dIso, day: d.getDate(), inMonth: d.getMonth() === month, lessons: byDate.get(dIso) || [] })
    }
    rows.push({ monday: mIso, week, days })
  }
  return rows
}

/** Сколько занятий в месяце (бейдж «17 занятий» у Figma 14). */
export function lessonsInMonth(plan, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  return allLessons(plan).filter((l) => l.date.startsWith(prefix)).length
}

/**
 * Карта диагностики по полосам (Figma 9): начинать отсюда · шатко · уверенно; внутри — от слабого к сильному, при
 * равенстве — порядок экзамена.
 */
export function bands(domains) {
  const order = { weak: 0, shaky: 1, strong: 2 }
  const out = { weak: [], shaky: [], strong: [] }
  ;(domains || []).forEach((d, i) => out[d.band]?.push({ ...d, order: i, share: d.total ? d.correct / d.total : 0 }))
  for (const k of Object.keys(order)) out[k].sort((a, b) => a.share - b.share || a.order - b.order)
  return out
}

/** Фаза, в которой ученик сегодня: по неделе плана, где лежит сегодня (до плана — первая, после — последняя). */
export function currentPhase(plan, todayIso) {
  const weeks = plan?.weeks || []
  if (!weeks.length) return 2
  const m = iso(monday(parse(todayIso)))
  const w = weeks.find((x) => x.monday === m) || (m < weeks[0].monday ? weeks[0] : weeks[weeks.length - 1])
  return w.phase
}

/**
 * Шаги роудмапа (Figma 12): диагностика «неделя 0» с датой сдачи и фазы плана с неделями, датами и счётом занятий.
 * Без плана (отчёт диагностики, «Посмотреть роудмап») — те же шаги по сроку до экзамена, без занятий.
 */
export function roadmapSteps(plan, diagnosticDate) {
  const steps = [{ phase: 1, from: 0, to: 0, monday: diagnosticDate || null, sunday: null, done: 1, total: 1 }]
  for (const r of phaseRanges(plan)) {
    const weeks = plan.weeks.filter((w) => w.index + 1 >= r.from && w.index + 1 <= r.to)
    const lessons = weeks.flatMap((w) => w.lessons)
    steps.push({
      ...r,
      monday: weeks[0].monday,
      sunday: iso(addDays(parse(weeks[weeks.length - 1].monday), 6)),
      done: lessons.filter((l) => l.status === 'done').length,
      total: lessons.length,
    })
  }
  return steps
}

/** План-набросок без занятий: недели и фазы по сроку до экзамена — для роудмапа до сборки плана. */
export function previewPlan(today, examDate) {
  const n = horizonWeeks(today, examDate)
  const start = monday(today)
  return { weeks: Array.from({ length: n }, (_, i) => ({ index: i, monday: iso(addDays(start, i * 7)), phase: phaseForWeek(i, n), lessons: [] })) }
}
