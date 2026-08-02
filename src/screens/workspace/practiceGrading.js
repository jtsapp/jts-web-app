// Чистая логика практики workspace. Зеркалит грейдинг LessonPlayer (norm()).

export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// answer: для choice/chips — выбранная строка; для gap — введённый текст.
export function gradeQuestion(question, answer) {
  if (!question || answer == null) return { correct: false }
  if (question.type === 'choice') return { correct: answer === question.answer }
  if (question.type === 'chips') return { correct: answer === question.answer }
  if (question.type === 'gap') {
    const good = (question.answers || []).map(norm)
    return { correct: norm(answer) !== '' && good.includes(norm(answer)) }
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
