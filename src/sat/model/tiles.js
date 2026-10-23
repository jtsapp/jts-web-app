// Плитки «Прогресса» (ТЗ SAT 21.10, задача 10): решено вопросов, примерный балл, серия, пройдено занятий.
// Примерный балл — последний ИЗМЕРЕННЫЙ результат из таблицы «Результаты» (задача 13), а не прогноз экзамена.

/** Последний результат по дате (при равной — тот, что в таблице ниже). null — результатов ещё нет. */
export function lastScore(entries = []) {
  if (!entries.length) return null
  const sorted = entries.slice().sort((a, b) => (a.takenOn < b.takenOn ? -1 : a.takenOn > b.takenOn ? 1 : 0))
  return sorted[sorted.length - 1]
}

/** Доля верных в процентах; без ответов — null, плитка покажет «нет данных», а не 0%. */
export function percent(correct, total) {
  return total ? Math.round((correct * 100) / total) : null
}
