// Время занятия группы — «Пн 05.10 19:00» из ISO с поясом Алматы (startsAt): без пересчёта в пояс браузера,
// иначе у студента за границей урок «переехал» бы на другой час и день.
const WEEKDAYS = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  kk: ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн', 'Жс'],
}

/** Занятие группы — 90 минут (ТЗ 21.10); конца занятия сервер не отдаёт, считаем от начала. */
export const LESSON_MINUTES = 90

/** За сколько минут до начала откроется ссылка на занятие (Figma «NEW 2», подпись под «Подключиться»). */
export const JOIN_OPENS_MIN = 15

export function satLessonTime(iso, lang = 'ru') {
  const s = String(iso)
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  const names = WEEKDAYS[lang] || WEEKDAYS.ru
  const weekday = names[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7]
  return `${weekday} ${s.slice(8, 10)}.${s.slice(5, 7)} ${s.slice(11, 16)}`
}

/** Короткий день недели занятия по Алматы — «Пт». */
export function lessonWeekday(iso, lang = 'ru') {
  return satLessonTime(iso, lang).split(' ')[0]
}

function nextDay(dayIso) {
  const [y, m, d] = dayIso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/** День занятия относительно сегодня: 'today' | 'tomorrow' | 'other' — для «Сегодня, 18:30–20:00» и чипа даты. */
export function lessonDay(iso, todayIso) {
  const day = String(iso).slice(0, 10)
  if (day === todayIso) return 'today'
  if (day === nextDay(todayIso)) return 'tomorrow'
  return 'other'
}

/** «18:30–20:00» — по Алматы, конец — начало плюс длина занятия. */
export function lessonClock(iso, minutes = LESSON_MINUTES) {
  const from = String(iso).slice(11, 16)
  const [h, m] = from.split(':').map(Number)
  const end = h * 60 + m + minutes
  const p = (n) => String(n).padStart(2, '0')
  return `${from}–${p(Math.floor(end / 60) % 24)}:${p(end % 60)}`
}

/**
 * Где занятие во времени: 'upcoming' (minutesLeft — минут до начала), 'live' — идёт, 'over' — прошло. Сравниваем
 * моменты (startsAt со смещением), поэтому пояс браузера не важен.
 */
export function lessonStatus(iso, nowMs, minutes = LESSON_MINUTES) {
  const start = Date.parse(iso)
  if (Number.isNaN(start)) return { state: 'upcoming', minutesLeft: null }
  if (nowMs < start) return { state: 'upcoming', minutesLeft: Math.ceil((start - nowMs) / 60000) }
  if (nowMs < start + minutes * 60000) return { state: 'live', minutesLeft: 0 }
  return { state: 'over', minutesLeft: 0 }
}

/**
 * Кнопка «Подключиться»: 'open' — ссылка есть и до начала не больше 15 минут (или занятие идёт), 'wait' — кнопка
 * неактивна с подписью «Ссылка откроется за 15 минут», 'hidden' — занятие прошло или отмечено проведённым.
 */
export function joinState(lesson, nowMs) {
  const st = lessonStatus(lesson.startsAt, nowMs)
  if (st.state === 'over' || lesson.status === 'DONE') return 'hidden'
  if (lesson.joinUrl && (st.state === 'live' || (st.minutesLeft != null && st.minutesLeft <= JOIN_OPENS_MIN))) return 'open'
  return 'wait'
}

/** Минуты словами: «2 ч 10 мин», «2 ч», «40 мин» — t передаёт экран (ключи sat.tasks.hm, sat.teach.h, sat.time.min). */
export function fmtMinutes(t, minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return t('sat.tasks.hm', { h: String(h), m: String(m) })
  if (h) return t('sat.teach.h', { h: String(h) })
  return t('sat.time.min', { n: String(m) })
}
