// Один урок источника лежит в каталоге тремя записями — self study, 1-to-1 и
// group: три режима делят файл урока, а различаются суффиксом кода и полем mode.
//
// Плоским списком это читается как тройной каталог: «Two hellos» три раза подряд,
// без единого признака, чем строки отличаются. Сворачиваем обратно в один урок с
// выбором режима — ровно так же, как это делает админка
// (web-admin/src/app/core/utils/catalog-lesson-mode.util.ts).
export const CATALOG_MODES = ['SELF_STUDY', 'ONE_TO_ONE', 'GROUP']

const MODE_SUFFIX = { SELF_STUDY: 'SELF', ONE_TO_ONE: '1TO1', GROUP: 'GROUP' }

/** Уровень, залитый до появления режимов, собран как 1-to-1 — так и показываем. */
export function lessonMode(lesson) {
  return MODE_SUFFIX[lesson?.mode] ? lesson.mode : 'ONE_TO_ONE'
}

/** `L01-1TO1` → `L01`; код без известного суффикса остаётся как есть. */
export function sourceCode(lesson) {
  const tail = `-${MODE_SUFFIX[lessonMode(lesson)]}`
  const code = String(lesson?.code || '')
  return code.endsWith(tail) ? code.slice(0, -tail.length) : code
}

/**
 * Записи каталога, собранные в уроки источника.
 *
 * Порядок уроков — как пришёл с сервера, порядок режимов внутри — фиксированный:
 * от самостоятельного к групповому, чтобы кнопки не переставлялись местами от
 * урока к уроку. Урок без кода (такое бывает у старых записей) остаётся сам по
 * себе: склеивать разные уроки в одну строку по пустому ключу нельзя.
 */
export function groupLessonsByMode(lessons) {
  const groups = new Map()
  for (const lesson of lessons || []) {
    const key = sourceCode(lesson) || `id-${lesson.id}`
    const group = groups.get(key) || { key, title: lesson.title, type: lesson.type, entries: [] }
    group.entries.push(lesson)
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    group.entries.sort((a, b) => CATALOG_MODES.indexOf(lessonMode(a)) - CATALOG_MODES.indexOf(lessonMode(b)))
  }
  return [...groups.values()]
}
