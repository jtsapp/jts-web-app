// Чистая логика практики workspace. Зеркалит грейдинг LessonPlayer (norm()).

export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// answer: для choice/chips — выбранная строка; для gap — введённый текст;
// для match (live-уроки) — карта left→выбранный right.
export function gradeQuestion(question, answer) {
  if (!question || answer == null) return { correct: false }
  if (question.type === 'choice') return { correct: answer === question.answer }
  if (question.type === 'chips') return { correct: answer === question.answer }
  if (question.type === 'gap') {
    // open-гэп (live-уроки, свободный ответ без эталонов): принимаем любой непустой ответ.
    if (question.open === true) return { correct: norm(answer) !== '' }
    const good = (question.answers || []).map(norm)
    return { correct: norm(answer) !== '' && good.includes(norm(answer)) }
  }
  if (question.type === 'match') {
    const pairs = question.pairs || []
    if (pairs.length === 0 || typeof answer !== 'object') return { correct: false }
    return { correct: pairs.every((pair) => answer[pair.left] === pair.right) }
  }
  return { correct: false }
}

// Шаг «пройден», если все его practice-вопросы отвечены верно.
export function stepProgress(steps, answers = {}) {
  let done = 0
  const total = steps.length
  for (const step of steps) {
    const qs = (step.blocks || []).filter((b) => b.type === 'practice').flatMap((b) => b.questions || [])
    if (qs.length === 0) continue
    const allOk = qs.every((q) => gradeQuestion(q, answers[q.id]).correct)
    if (allOk) done++
  }
  return { done, total }
}
