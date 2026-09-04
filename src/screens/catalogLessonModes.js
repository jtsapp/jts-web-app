// Один урок источника глазами каталога.
//
// После заливки урок лежит в каталоге тремя записями — self study, 1-to-1,
// group, — и клиент рисовал их подряд: «Two hellos» три раза без единого
// признака, чем строки отличаются, а счётчик юнита показывал 9 вместо 3.
//
// Правило группировки взято у админки (`catalog-lesson-mode.util.ts`) один в
// один и намеренно: разойдись они — один и тот же уровень выглядел бы по-разному
// у преподавателя и у ученика, и спорить о том, чей каталог прав, было бы не с
// чем. Оба конца получают от бэкенда одни и те же `code` и `mode`.

/** Порядок режимов везде один: от самостоятельного к групповому. */
export const LESSON_MODES = Object.freeze(['SELF_STUDY', 'ONE_TO_ONE', 'GROUP'])

const MODE_LABELS = Object.freeze({
  SELF_STUDY: 'Self study',
  ONE_TO_ONE: '1 to 1',
  GROUP: 'Group',
})

/** Суффиксы, которыми конвертер различает записи одного урока. */
const MODE_SUFFIX = Object.freeze({
  SELF_STUDY: 'SELF',
  ONE_TO_ONE: '1TO1',
  GROUP: 'GROUP',
})

export function lessonModeLabel(mode) {
  return MODE_LABELS[mode] || MODE_LABELS.ONE_TO_ONE
}

/** Уровень, залитый до появления режимов, собран как 1-to-1 — так и показываем. */
export function lessonModeOf(lesson) {
  return lesson?.mode || 'ONE_TO_ONE'
}

/** `L01-1TO1` → `L01`; код без известного суффикса остаётся как есть. */
export function sourceCode(lesson) {
  const code = String(lesson?.code ?? '')
  const tail = `-${MODE_SUFFIX[lessonModeOf(lesson)]}`
  return code.endsWith(tail) ? code.slice(0, -tail.length) : code
}

/**
 * Записи — в уроки источника, с сохранением порядка уроков и режимов.
 *
 * Группируем по коду без суффикса, а не по названию: названия у разных уроков
 * совпадают («Two hellos» есть на двух уровнях), и по ним склеились бы чужие
 * записи. Урок без кода остаётся сам по себе — иначе все такие слиплись бы в
 * одну строку по пустому ключу.
 */
export function groupLessonsByMode(lessons) {
  const groups = new Map()
  for (const lesson of lessons || []) {
    const code = sourceCode(lesson)
    const key = code || `id-${lesson?.id}`
    const group = groups.get(key) || { key, code, title: lesson?.title, type: lesson?.type, entries: [] }
    group.entries.push(lesson)
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    group.entries.sort((a, b) => LESSON_MODES.indexOf(lessonModeOf(a)) - LESSON_MODES.indexOf(lessonModeOf(b)))
  }
  return [...groups.values()]
}
