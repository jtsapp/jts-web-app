// Размер набора практики. Набор по навыку — размером с модуль Digital SAT (27 вопросов R&W, 22 Math): студент
// привыкает к объёму одного захода экзамена (ТЗ SAT 17.10, задача 7). Ручной выбор меньшего набора остаётся.

export const MODULE_SIZE = { rw: 27, math: 22 }

export function moduleSize(section) {
  return MODULE_SIZE[section] ?? MODULE_SIZE.rw
}

/** Варианты селектора «Количество вопросов»: короткие наборы и полный модуль секции. */
export function countOptions(section) {
  return [5, 10, 20, moduleSize(section)]
}

/**
 * Количество после смены секции: стоял полный модуль прежней секции — берём модуль новой (27 ↔ 22),
 * выбрал короткий набор сам — не трогаем.
 */
export function countForSection(count, from, to) {
  return count === moduleSize(from) ? moduleSize(to) : count
}
