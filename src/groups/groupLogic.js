// Чистая логика «Выбрать группу» (ТЗ кабинетов, 14): пожелания ученика, подписи графика и четыре шага записи.
// Без React и сети, чтобы её можно было накрыть тестом.

export const DIRECTIONS = ['GENERAL', 'KIDS', 'SAT', 'IELTS']
export const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1']
export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
export const DAYPARTS = ['MORNING', 'DAY', 'EVENING']
export const LANGUAGES = ['RU', 'KK']

/** Пожелания по умолчанию: уровень берётся из результата теста, язык — из языка интерфейса. */
export function defaultWishes(userLevel, lang) {
  return {
    direction: 'GENERAL',
    level: LEVELS.includes(userLevel) ? userLevel : 'A1',
    language: lang === 'kk' ? 'KK' : 'RU',
    days: [],
    dayparts: [],
  }
}

/** Без дней и времени суток сервер не посчитает совпадение (60% дни, 40% время суток), поэтому кнопка ждёт обоих. */
export function wishesReady(wishes) {
  return wishes.days.length > 0 && wishes.dayparts.length > 0
}

/** Добавляет или убирает значение, сохраняя порядок недели/суток. */
export function toggled(list, value, order) {
  const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  return order.filter((item) => next.includes(item))
}

/** «19:00:00» → «19:00». */
export function clock(time) {
  return String(time || '').slice(0, 5)
}

/** Локальная дата-время сервера «2026-10-29T10:00:00» без перевода часового пояса: бронь и сроки считаются по Алматы. */
export function splitLocal(iso) {
  const [date = '', time = ''] = String(iso || '').split('T')
  return { date, time: time.slice(0, 5) }
}

const LOCALES = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' }

/** «5 ноября» на языке интерфейса; пустая или битая дата — прочерк. */
export function formatDate(iso, lang) {
  const { date } = splitLocal(iso)
  if (!date) return '—'
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.ru, { day: 'numeric', month: 'long' }).format(parsed)
}

/** «Пн · Ср · Пт 19:00 · 60 мин» — график группы; подписи дней передаёт вызывающий (t нужен для языка). */
export function scheduleLine(group, dayLabel, minutesLabel) {
  return `${(group.days || []).map(dayLabel).join(' · ')} ${clock(group.startTime)} · ${group.durationMinutes} ${minutesLabel}`
}

/**
 * Четыре шага записи: место выбрано → оплата или пробный урок → подтверждение менеджера → напоминание.
 * Первый невыполненный шаг — текущий, остальные ждут; «напоминание» — обещание на будущее и закрытым не бывает.
 */
export function enrollmentSteps(enrollment) {
  const payDone = enrollment.paymentStatus === 'PAID' || enrollment.paymentStatus === 'TRIAL'
  const done = [true, payDone, !!enrollment.confirmed, false]
  const current = done.findIndex((value) => !value)
  return ['seat', 'pay', 'confirm', 'remind'].map((key, index) => ({
    key,
    state: done[index] ? 'done' : index === current ? 'on' : 'todo',
  }))
}

/** Бронь без оплаты и пробного урока ещё держит место: только у неё есть срок «до …». */
export function bookingActive(enrollment) {
  return enrollment.paymentStatus === 'BOOKING' && !!enrollment.bookedUntil
}

/** Подходящее предложение: «лучшее» — первое из тех, где ещё есть места (сервер уже отсортировал по совпадению). */
export function bestSuggestionId(suggestions) {
  const best = suggestions.find((item) => !item.full)
  return best ? best.group.id : null
}

/** Свободные группы идут сверху, полные — внизу, порядок по совпадению внутри каждой части сохраняется. */
export function orderedSuggestions(suggestions) {
  return [...suggestions.filter((item) => !item.full), ...suggestions.filter((item) => item.full)]
}
