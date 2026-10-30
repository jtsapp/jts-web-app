// Плитки «Прогресса» (ТЗ SAT 21.10, задача 10): решено вопросов, примерный балл, серия, пройдено занятий.
// Примерный балл — последний ИЗМЕРЕННЫЙ результат из таблицы «Результаты» (задача 13), а не прогноз экзамена.

const byDate = (a, b) => (a.takenOn < b.takenOn ? -1 : a.takenOn > b.takenOn ? 1 : 0)
const rejected = (e) => e?.reviewStatus === 'REJECTED'

/**
 * Последний результат по дате (при равной — тот, что в таблице ниже). Отклонённый куратором не в счёт (дизайн NEW 2,
 * 17:8454): балл, который куратор не принял, не может быть «примерным баллом». null — результатов ещё нет.
 */
export function lastScore(entries = []) {
  const sorted = entries.filter((e) => !rejected(e)).sort(byDate)
  return sorted.length ? sorted[sorted.length - 1] : null
}

/**
 * Что рисует плитка «Примерный балл» (17:8454): entry — засчитанный балл; rejected — самый свежий результат, если его
 * отклонили. Тогда плитка показывает прошлый засчитанный балл серым с чипом «отклонён» — студент видит, что новый
 * балл не потерялся, а ждёт исправления.
 */
export function scoreTile(entries = []) {
  const all = entries.slice().sort(byDate)
  const newest = all[all.length - 1] || null
  return { entry: lastScore(entries), rejected: rejected(newest) ? newest : null }
}

/** Доля верных в процентах; без ответов — null, плитка покажет «нет данных», а не 0%. */
export function percent(correct, total) {
  return total ? Math.round((correct * 100) / total) : null
}

/**
 * Плитка «Пройдено занятий» («NEW 2», 17:10026): «5 / 24» и подпись пакета — «базовый пакет · 21%», с Challenge
 * (дополнительный пакет, 36 занятий) — «с Challenge · 14%»; пока не было ни одного занятия — только пакет, без «0%».
 * Пакет и счёт — из роадмапа (`/mobile/sat/roadmap`), тот же счётчик, что у «Плана». null — роадмап не пришёл.
 */
export function lessonsTile(roadmap) {
  if (!roadmap || !roadmap.lessonCount) return null
  const attended = roadmap.attended || 0
  const total = roadmap.lessonCount
  return {
    attended,
    total,
    pkg: roadmap.packages?.extra ? 'extra' : 'base',
    pct: attended ? Math.round((attended * 100) / total) : null,
  }
}
