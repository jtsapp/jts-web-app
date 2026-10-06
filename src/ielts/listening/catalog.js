// Каталог Listening из GET /mobile/ielts/tests?skill=listening: разделы «Обучения» и «Пробных тестов».
// Listening общий для Academic и General Training (ТЗ §3), поэтому трек здесь не фильтрует.

// типы и дриллы — свои строки «Обучения» (раньше стояли «скоро» и сваливались в общие задания)
export const listeningTasks = (items) => (items || []).filter((t) => t.kind === 'part')
export const listeningTypes = (items) => (items || []).filter((t) => t.kind === 'types')
export const listeningDrills = (items) => (items || []).filter((t) => t.kind === 'drill')
export const listeningFullTests = (items) => (items || []).filter((t) => t.kind === 'test')
export const dictations = (items) => (items || []).filter((t) => t.kind === 'dictation')
export const spellings = (items) => (items || []).filter((t) => t.kind === 'spelling')

// Сводка для карточки Listening во вкладке «Обучение» (Figma: «1 часть · пройдена 2 раза», «пройдено 6 из 10»).
export function listeningSummary(items) {
  const sum = (list) => ({ total: list.length, done: list.filter((t) => t.attemptCount > 0).length, attempts: list.reduce((a, t) => a + (t.attemptCount || 0), 0) })
  return { tasks: sum(listeningTasks(items)), types: sum(listeningTypes(items)), drills: sum(listeningDrills(items)), dictation: sum(dictations(items)), spelling: sum(spellings(items)), full: sum(listeningFullTests(items)) }
}

export function listeningAccuracy(items) {
  let score = 0
  let max = 0
  for (const t of items || []) {
    if (!t.lastAttempt || t.kind === 'dictation' || t.kind === 'spelling') continue
    score += t.lastAttempt.rawScore
    max += t.lastAttempt.maxScore
  }
  return max > 0 ? Math.round((score / max) * 100) : null
}
