// Pure helpers for the lesson-schedule journal. No network, no React — unit-tested.

// scheduledAt is a zone-less LocalDateTime ("2026-08-10T11:30:00"). new Date() on a
// string without "Z"/offset parses in LOCAL time, which is exactly what we want.
export function parseLessonDate(scheduledAt) {
  return new Date(scheduledAt)
}

export function lessonEnd(occ) {
  const start = parseLessonDate(occ.scheduledAt)
  return new Date(start.getTime() + (occ.durationMinutes || 0) * 60000)
}

export function canJoin(lessonStatus) {
  return lessonStatus === 'IN_PROGRESS' || lessonStatus === 'PAUSED'
}

// Maps backend lessonStatus (+ wall-clock) to an i18n suffix under schedule.status.*.
// A SCHEDULED lesson whose end time is in the past is "overdue" (mirrors web-admin).
export function lessonStateKey(occ, now = new Date()) {
  switch (occ.lessonStatus) {
    case 'IN_PROGRESS': return 'inProgress'
    case 'PAUSED': return 'paused'
    case 'COMPLETED': return 'completed'
    case 'CANCELLED': return 'cancelled'
    case 'SCHEDULED':
    default:
      return lessonEnd(occ) < now ? 'overdue' : 'scheduled'
  }
}

export function dayKey(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

// 'today' | 'tomorrow' | null (null => caller formats the actual date).
export function dayLabelKey(date, now = new Date()) {
  const k = dayKey(date)
  if (k === dayKey(now)) return 'today'
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (k === dayKey(tomorrow)) return 'tomorrow'
  return null
}

// Day buckets ascending by date; items within a day ascending by start time.
export function groupByDay(occurrences) {
  const buckets = new Map()
  for (const occ of occurrences) {
    const d = parseLessonDate(occ.scheduledAt)
    const k = dayKey(d)
    if (!buckets.has(k)) {
      buckets.set(k, { dayKey: k, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), items: [] })
    }
    buckets.get(k).items.push(occ)
  }
  const groups = [...buckets.values()]
  groups.sort((a, b) => a.date - b.date)
  for (const g of groups) {
    g.items.sort((a, b) => parseLessonDate(a.scheduledAt) - parseLessonDate(b.scheduledAt))
  }
  return groups
}

// 6-week (42-day) Monday-first grid covering `month` (0-based) of `year`.
// Leading/trailing cells come from the adjacent months; `inMonth` flags the target month.
export function buildMonthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // JS getDay: 0=Sun..6=Sat → Monday-first offset
  const start = new Date(year, month, 1 - offset)
  const weeks = []
  for (let w = 0; w < 6; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)
      days.push({ date, inMonth: date.getFullYear() === year && date.getMonth() === month })
    }
    weeks.push(days)
  }
  return weeks
}

// Map dayKey → occurrences of that day, each bucket sorted ascending by start time.
export function occurrencesByDayKey(occurrences) {
  const map = new Map()
  for (const occ of occurrences) {
    const k = dayKey(parseLessonDate(occ.scheduledAt))
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(occ)
  }
  for (const items of map.values()) {
    items.sort((a, b) => parseLessonDate(a.scheduledAt) - parseLessonDate(b.scheduledAt))
  }
  return map
}

// Shift a (year, month) pair by `delta` months, normalized across year boundaries.
export function monthShift(year, month, delta) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

// Local-midnight Date from a "YYYY-MM-DD" dayKey.
export function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
