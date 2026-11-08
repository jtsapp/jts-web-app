// Размер набора практики. Набор по навыку — размером с модуль Digital SAT (27 вопросов R&W, 22 Math): студент
// привыкает к объёму одного захода экзамена (ТЗ SAT 17.10, задача 7). Ручной выбор меньшего набора остаётся.

export const MODULE_SIZE = { rw: 27, math: 22 }

/** Набор практики на «Сегодня» — дневная доза, а не репетиция модуля (решение 08.11.2026). */
export const TODAY_SIZE = 10

export function moduleSize(section) {
  return MODULE_SIZE[section] ?? MODULE_SIZE.rw
}

/**
 * Варианты селектора «Количество вопросов»: 5 / 10 / 20 / 22 / 27 в обеих секциях (решение 08.11.2026) — 22 и 27 это
 * длины настоящих модулей Math и R&W. По умолчанию — модуль своей секции; на «Сегодня» набор остаётся из 10.
 */
export function countOptions() {
  return [5, 10, 20, MODULE_SIZE.math, MODULE_SIZE.rw]
}

/**
 * Количество после смены секции: стоял полный модуль прежней секции — берём модуль новой (27 ↔ 22),
 * выбрал короткий набор сам — не трогаем.
 */
export function countForSection(count, from, to) {
  return count === moduleSize(from) ? moduleSize(to) : count
}
