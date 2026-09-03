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
