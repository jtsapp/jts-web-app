// Мастерство Shadowing — чистые функции (без DOM/сети/хранилища), юнит-тестируемы.
// Фраза «освоена», когда лучший балл произношения достигает порога. Мастерство
// урока = доля освоенных фраз. Пороги вынесены в константы, чтобы UI и подсчёт
// использовали одни значения.

export const MASTERY_THRESHOLD = 80

export function isPhraseMastered(score) {
  return typeof score === 'number' && score >= MASTERY_THRESHOLD
}

// scoresMap — Map|объект segId → лучший балл (из recordings.getLessonScores).
// total — всего фраз в уроке. Возвращает { mastered, pct } (pct 0..100).
export function lessonMastery(scoresMap, total) {
  const values = scoresMap instanceof Map ? [...scoresMap.values()] : Object.values(scoresMap || {})
  const mastered = values.filter(isPhraseMastered).length
  const t = Number(total) || 0
  const pct = t > 0 ? Math.round((mastered / t) * 100) : 0
  return { mastered, pct }
}

// Уровень слова в тепловой карте. Пропущенное слово (Omission) — отдельный
// «miss» (серый/зачёркнутый); остальное красится по accuracy (Mispronunciation
// обычно даёт низкий балл → bad). Конкретные цвета — в CSS (.sh-w--*).
export function wordLevel(accuracy, error) {
  if (error === 'Omission') return 'miss'
  const a = Number(accuracy) || 0
  if (a >= 80) return 'good'
  if (a >= 60) return 'mid'
  return 'bad'
}
