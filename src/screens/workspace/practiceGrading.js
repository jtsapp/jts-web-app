// Чистая логика практики workspace. Зеркалит грейдинг LessonPlayer (norm()).

export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// answer: для choice/chips — выбранная строка; для gap — введённый текст;
// для match (live-уроки) — карта left→выбранный right; для order — массив слов
// в том порядке, в каком их составил ученик; для multi — массив отмеченных
// вариантов; для pick — сам факт выбора (оценивать нечего, опрос про себя).
export function gradeQuestion(question, answer) {
  if (!question || answer == null) return { correct: false }
  if (question.type === 'choice') return { correct: answer === question.answer }
  if (question.type === 'chips') return { correct: answer === question.answer }
  // Опрос про себя. Верного ответа нет — засчитываем сам факт выбора, иначе шаг
  // с ним никогда не считался бы пройденным.
  if (question.type === 'pick') {
    return { correct: Array.isArray(answer) ? answer.length > 0 : norm(answer) !== '' }
  }
  if (question.type === 'multi') {
    // Засчитываем только полный набор: отмечено всё верное и ничего лишнего.
    // Частичное совпадение здесь означало бы «отметь наугад побольше».
    const given = new Set((Array.isArray(answer) ? answer : []).map(norm))
    const want = new Set((question.answers || []).map(norm))
    return {
      correct: want.size > 0 && given.size === want.size && [...want].every((w) => given.has(w)),
    }
  }
  if (question.type === 'order') {
    const given = Array.isArray(answer) ? answer : []
    const want = question.answer || []
    // Сравниваем по norm(): регистр и точка в конце — не то, чему учит задание
    // «собери предложение», а слова курс отдаёт ровно теми же строками.
    return {
      correct:
        want.length > 0 &&
        given.length === want.length &&
        given.every((word, i) => norm(word) === norm(want[i])),
    }
  }
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
