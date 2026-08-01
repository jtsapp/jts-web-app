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
