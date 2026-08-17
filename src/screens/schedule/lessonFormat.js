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

// «18:00 – 19:00». Без durationMinutes конца у урока нет — показываем начало.
export function lessonTimeRange(occ, locale = 'ru') {
  const time = (date) => date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const start = time(parseLessonDate(occ.scheduledAt))
  return occ.durationMinutes ? `${start} – ${time(lessonEnd(occ))}` : start
}

// Тема урока в карточке — название материала, прикреплённого к первому разделу.
// Своего поля «тема» у урока на бэкенде нет: преподаватель вешает урок каталога
// материалом в раздел, и его имя — единственное, что описывает занятие словами.
// Хвост « · 1-на-1» ставит сам бэкенд, чтобы различать три регистрации одного
// урока в библиотеке (LessonSectionService.createCatalogMaterial); ученику этот
// служебный суффикс ничего не говорит, поэтому обрезаем.
const MATERIAL_MODE_SEP = ' · '

export function lessonTopicFromSections(sections) {
  const ordered = (Array.isArray(sections) ? sections : [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  for (const section of ordered) {
    const titled = (section.materials || []).find((m) => m && typeof m.title === 'string' && m.title.trim())
    if (!titled) continue
    const title = titled.title.trim()
    const cut = title.lastIndexOf(MATERIAL_MODE_SEP)
    return cut > 0 ? title.slice(0, cut).trim() : title
  }
  return null
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
