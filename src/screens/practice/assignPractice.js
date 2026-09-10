/**
 * Выдача заданий «Практики» на дом — общая механика для каталога.
 *
 * Преподаватели просили: «в „Практике“ много интересных заданий, особенно по
 * грамматике, больше, чем в самих уроках», а раздел жил только у ученика.
 * Бэкенд к этому уже готов (V223 + /homework/lesson/{id}/exercises/from-practice),
 * не хватало только места, откуда выдать.
 */

/** Отдельный ключ на каждое нажатие: повтор с тем же ключом не задваивает выдачу. */
export function newBatchId() {
  return `pr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Теги из названия юнита в каталоге («Present <b>Simple</b>») в подпись не идут. */
export function stripTags(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').trim()
}

/** Юнит каталога → адрес, который понимает бэкенд. */
export function unitToPayload(level, unit) {
  return {
    level: String(level || '').toLowerCase(),
    unitId: unit.id,
    title: stripTags(unit.title),
    section: unit.secName || null,
  }
}

/**
 * Уроки, которым есть смысл выдать задание.
 *
 * Отменённые отсеиваем: домашняя работа привязана к занятию, и у отменённого
 * её никто не увидит. Порядок — ближайший сверху: задают обычно на том уроке,
 * который идёт или только что прошёл.
 */
export function assignableLessons(occurrences, now = new Date()) {
  const time = (o) => {
    const parsed = Date.parse(o?.scheduledAt)
    return Number.isNaN(parsed) ? null : parsed
  }
  const list = (Array.isArray(occurrences) ? occurrences : []).filter(
    (o) => o?.lessonId != null
      && time(o) !== null
      && String(o.lessonStatus || '').toUpperCase() !== 'CANCELLED',
  )
  const future = list.filter((o) => time(o) >= now.getTime()).sort((a, b) => time(a) - time(b))
  const past = list.filter((o) => time(o) < now.getTime()).sort((a, b) => time(b) - time(a))
  return [...future, ...past]
}

/**
 * Срок сдачи. Неделя — обычный промежуток между занятиями, за него домашку и
 * делают; то же правило и то же число дней у выдачи из админки
 * (homework-due-date.util.ts, DEFAULT_DUE_DAYS) — иначе один и тот же
 * преподаватель получал бы разные сроки по умолчанию в двух местах.
 */
export const DUE_DAYS = 7

/**
 * `Date` → `YYYY-MM-DD` по ЛОКАЛЬНОМУ календарю.
 *
 * Не через `toISOString()`: он переводит в UTC, и в Алматы (UTC+5) полночь
 * уезжает на предыдущий день — срок «до 10-го» отправлялся бы девятым.
 */
export function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Сегодняшний день — раньше него сервер срок не примет. */
export function minDueDate(now = new Date()) {
  return toIsoDate(now)
}

/** Подставленный срок: преподавателю на уроке не до выбора даты. */
export function defaultDueDate(now = new Date()) {
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + DUE_DAYS)
  return toIsoDate(due)
}

/**
 * Срок в прошлом — сервер отвечает 400 и не пишет ни одного задания.
 *
 * Атрибут `min` у нативного поля от этого не спасает: дату там можно набрать
 * руками. Пустая строка — «без срока», это разрешено.
 */
export function isPastDue(value, now = new Date()) {
  if (!value) return false
  return String(value) < minDueDate(now)
}

/**
 * `YYYY-MM-DD` → `Date` локальной полуночи.
 *
 * Через части, а не `new Date(строка)`: такую строку движок читает как полночь
 * UTC, и восточнее Гринвича подпись «сдать до» показывала бы соседний день.
 */
export function parseIsoDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/**
 * Срок, который в итоге стоит в работе, — из ответа сервера, а не из поля.
 *
 * Сервер двигает срок только вперёд: если в работе уже стоял более поздний, он
 * останется, и говорить преподавателю «сдать до» по выбранной дате значило бы
 * назвать день, которого у ученика нет.
 */
export function assignedDueDate(response) {
  const list = Array.isArray(response) ? response : [response]
  return list[0]?.dueDate ?? null
}
