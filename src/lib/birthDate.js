// Возраст в анкете — это дата рождения, а не число лет: она не протухает через
// год и бэкенд хранит именно её (UpdateUserRequest.birthDate, ISO yyyy-mm-dd).
// Живёт отдельно от экрана, потому что тем же правилом проверяют дату и
// регистрация (RegisterBirthDatePage), и правка профиля (ProfilePage).

// Нижняя граница — школьники: курс A0 рассчитан на детей, а всё, что младше,
// на практике оказывается опечаткой в годе. Верхняя отсекает 1899-й, набранный
// вместо 1989-го.
export const MIN_AGE = 6
export const MAX_AGE = 100

// Разбор 'yyyy-mm-dd' по частям, а не через new Date(строка): такую строку
// браузер читает как UTC, и в поясе +05 получается предыдущий день — на
// границе дня рождения это ошибка ровно в год.
function parseIso(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const probe = new Date(y, mo - 1, d)
  // Date молча переносит 31 февраля на 3 марта — сверяем, что вернулось то же.
  if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) return null
  return [y, mo, d]
}

// Полных лет на сегодня; null — дату разобрать не удалось.
export function ageOn(value, today = new Date()) {
  const parts = parseIso(value)
  if (!parts) return null
  const [y, mo, d] = parts
  const month = today.getMonth() + 1
  const hadBirthday = month > mo || (month === mo && today.getDate() >= d)
  return today.getFullYear() - y - (hadBirthday ? 0 : 1)
}

// Причина отказа ('invalid' | 'tooYoung' | 'tooOld') или null, если дата
// годится. Причины разделены: «укажите корректную дату» на месте «вам нет 6»
// не объясняет пользователю, что именно не так.
export function birthDateProblem(value, today = new Date()) {
  const age = ageOn(value, today)
  if (age === null || age < 0) return 'invalid'
  if (age < MIN_AGE) return 'tooYoung'
  if (age > MAX_AGE) return 'tooOld'
  return null
}

export function isValidBirthDate(value, today = new Date()) {
  return birthDateProblem(value, today) === null
}

function isoYearsAgo(today, years) {
  const d = new Date(today.getFullYear() - years, today.getMonth(), today.getDate())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// Границы для <input type="date"> — нативный пикер сам не даёт промахнуться.
// Нижняя намеренно на год свободнее MAX_AGE: атрибут — подсказка, решение
// принимает birthDateProblem, и рассинхрон границ отнимал бы валидные даты.
export function maxBirthDate(today = new Date()) {
  return isoYearsAgo(today, MIN_AGE)
}
export function minBirthDate(today = new Date()) {
  return isoYearsAgo(today, MAX_AGE + 1)
}
