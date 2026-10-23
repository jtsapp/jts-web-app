// Время занятия группы — «Пн 05.10 19:00» из ISO с поясом Алматы (startsAt): без пересчёта в пояс браузера,
// иначе у студента за границей урок «переехал» бы на другой час и день.
const WEEKDAYS = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  kk: ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн', 'Жс'],
}

export function satLessonTime(iso, lang = 'ru') {
  const s = String(iso)
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  const names = WEEKDAYS[lang] || WEEKDAYS.ru
  const weekday = names[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7]
  return `${weekday} ${s.slice(8, 10)}.${s.slice(5, 7)} ${s.slice(11, 16)}`
}
