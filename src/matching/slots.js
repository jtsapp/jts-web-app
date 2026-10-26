// Недельные слоты подбора хранятся в UTC (MatchingDtos.Slot бэкенда): ISO-день 1–7 и время. Ученик видит их в
// своём поясе, поэтому день и время переводятся ВМЕСТЕ — 07:00 понедельника в Сеуле это 22:00 воскресенья UTC.
const WEEK = 7 * 1440
// Алматы — UTC+5 круглый год (Казахстан живёт в одном поясе с 2024 г.): школьные сроки и «разные дни».
const SCHOOL_OFFSET = 300
const DAY_SHORT = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  kk: ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

export function dayShort(lang, day) {
  return (DAY_SHORT[lang] || DAY_SHORT.ru)[day - 1]
}

export function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Almaty'
  } catch {
    return 'Asia/Almaty'
  }
}

export function studentTimezone(card) {
  return card?.timezone || deviceTimezone()
}

// Форматтер на пояс создаётся один раз: сетка зовёт перевод для каждой из ~110 ячеек на каждый клик.
const wallFormats = new Map()
function wallFormat(tz) {
  let f = wallFormats.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
    wallFormats.set(tz, f)
  }
  return f
}

// Смещение пояса в минутах на момент `at`: Intl отдаёт стеночное время пояса, разница с UTC и есть смещение.
export function zoneOffsetMin(tz, at = new Date()) {
  try {
    const parts = Object.fromEntries(wallFormat(tz).formatToParts(at).map((p) => [p.type, p.value]))
    const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute)
    return Math.round((wall - Math.floor(at.getTime() / 60000) * 60000) / 60000)
  } catch {
    return SCHOOL_OFFSET
  }
}

export function utcLabel(tz, at = new Date()) {
  const m = zoneOffsetMin(tz, at)
  const sign = m < 0 ? '−' : '+'
  const abs = Math.abs(m)
  return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? ':' + String(abs % 60).padStart(2, '0') : ''}`
}

export function hhmm(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
}

const weekMinutes = (slot) =>
  (slot.weekday - 1) * 1440 + Number(slot.start.slice(0, 2)) * 60 + Number(slot.start.slice(3, 5))

function fromWeekMinutes(m) {
  const x = ((m % WEEK) + WEEK) % WEEK
  return { weekday: Math.floor(x / 1440) + 1, start: hhmm(x % 1440) + ':00' }
}

// Старты уроков в поясе ученика 07:00–22:00: тариф 60 — каждый час, 30 — каждые полчаса (ТЗ §2.3). Сетка учителей
// хранит старты UTC с шагом урока, поэтому в поясах с получасовым смещением (Индия +5:30, Непал +5:45) строки
// сдвигаются вместе с ним — иначе ни одна строка не попала бы на старт учителя и сетка была бы вся из нулей.
export function gridRows(duration, tz, at = new Date()) {
  const step = duration === 30 ? 30 : 60
  const shift = tz ? ((zoneOffsetMin(tz, at) % step) + step) % step : 0
  const out = []
  for (let m = 7 * 60 + shift; m <= 22 * 60 + shift; m += step) out.push(m)
  return out
}

export function toUtcSlot(day, minutes, tz, at = new Date()) {
  return fromWeekMinutes((day - 1) * 1440 + minutes - zoneOffsetMin(tz, at))
}

export function localOf(slot, tz, at = new Date()) {
  const x = (((weekMinutes(slot) + zoneOffsetMin(tz, at)) % WEEK) + WEEK) % WEEK
  return { day: Math.floor(x / 1440) + 1, minutes: x % 1440 }
}

export const slotKey = (s) => `${s.weekday}-${s.start.slice(0, 5)}`
export const sameSlot = (a, b) => slotKey(a) === slotKey(b)

export function slotLabel(slot, tz = deviceTimezone(), lang = 'ru', at = new Date()) {
  const { day, minutes } = localOf(slot, tz, at)
  return `${dayShort(lang, day)} ${hhmm(minutes)}`
}

export function sortSlots(slots, tz, at = new Date()) {
  const local = (s) => {
    const { day, minutes } = localOf(s, tz, at)
    return day * 1440 + minutes
  }
  return [...slots].sort((a, b) => local(a) - local(b))
}

// «Разные дни» — по дню школы, тем же правилом, что MatchingSlots.validate на сервере: иначе кнопка разрешала бы
// набор, который сервер отвергнет у ученика рядом с полуночью.
export function schoolDay(slot) {
  return Math.floor(((((weekMinutes(slot) + SCHOOL_OFFSET) % WEEK) + WEEK) % WEEK) / 1440) + 1
}

export function schoolDaysCount(slots) {
  return new Set(slots.map(schoolDay)).size
}

export function fitSlotsOf(cells, teacherId, pickedKeys) {
  const picked = new Set(pickedKeys)
  return cells
    .filter((c) => picked.has(slotKey(c)) && c.teacherIds.includes(teacherId))
    .map(({ weekday, start }) => ({ weekday, start }))
}

// Учитель подходит, если свободен в отмеченное время хотя бы в N разных днях (ТЗ §2.3).
export function teachersFitting(cells, pickedKeys, n) {
  const ids = new Set(cells.flatMap((c) => c.teacherIds))
  return [...ids].filter((id) => schoolDaysCount(fitSlotsOf(cells, id, pickedKeys)) >= n).sort((a, b) => a - b)
}

// «Подсвечены часы, где учителей больше всего» (ТЗ §2.3, «подходит 0 учителей»).
export function bestCells(cells, pickedKeys, k = 10) {
  const picked = new Set(pickedKeys)
  return cells
    .filter((c) => !picked.has(slotKey(c)) && c.teacherIds.length)
    .sort((a, b) => b.teacherIds.length - a.teacherIds.length || weekMinutes(a) - weekMinutes(b))
    .slice(0, k)
    .map(slotKey)
}

// Сроки бэкенда — LocalDateTime школы без пояса (CoordinatorClock): читаем как UTC+5.
export function schoolTimeToDate(local) {
  if (!local) return null
  const d = new Date(String(local).slice(0, 19) + '+05:00')
  return Number.isNaN(d.getTime()) ? null : d
}

// Первый урок не раньше чем через сутки после подтверждения (ТЗ §2.7) — ближайшее такое наступление слотов.
export function nextOccurrence(slots, at = new Date()) {
  if (!slots?.length) return null
  const from = at.getTime() + 24 * 3600 * 1000
  let best = null
  for (const s of slots) {
    const base = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()))
    const today = base.getUTCDay() || 7
    for (let w = 0; w < 3; w += 1) {
      const d = new Date(base.getTime() + ((s.weekday - today + 7) % 7 + 7 * w) * 86400000)
      d.setUTCHours(Number(s.start.slice(0, 2)), Number(s.start.slice(3, 5)), 0, 0)
      if (d.getTime() >= from) {
        if (!best || d < best) best = d
        break
      }
    }
  }
  return best
}

export function formatDateTime(date, tz, lang = 'ru', { withTime = true } = {}) {
  if (!date) return ''
  const locale = lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU'
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: tz, day: '2-digit', month: '2-digit', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ')
  }
}
