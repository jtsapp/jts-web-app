// Чистая логика практики workspace. Зеркалит грейдинг LessonPlayer: сверка
// текста — общая (src/lib/answer-match.js), чтобы «do not» и «don't» здесь
// значили то же, что в «Обучении» и в движке курса.
import { answerMatches, normAnswer } from '../../lib/answer-match.js'

export const norm = normAnswer

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
    // manual: вердикта нет и быть не может — сверять не с чем. `correct` здесь
    // означает только «ответ дан», чтобы шаг считался пройденным и работу можно
    // было сдать; показывать по нему галочку «верно» нельзя.
    return { correct: Array.isArray(answer) ? answer.length > 0 : norm(answer) !== '', manual: true }
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
    // Открытый пропуск — эталона у него нет: либо курс его не дал, либо он
    // потерялся при разборе урока. Раньше здесь любой непустой ответ получал
    // зелёную галочку, и набор случайных букв показывался ученику как верный
    // ответ. Проверить такое может только преподаватель (FR-74), поэтому
    // говорим об этом прямо: correct лишь означает «ответ дан» и нужен, чтобы
    // шаг засчитался, а вердикта — нет.
    if (question.open === true) return { correct: norm(answer) !== '', manual: true }
    // Контекст задания передаём так же, как остальные три места (LessonPlayer,
    // CourseStepPlayer) и как считает сервер: в «перепиши предложение» эталоном
    // записана только изменяемая часть, а ученик пишет фразу целиком. Без cue
    // расширение выключено (answer-match.js: `if (!cue) return false`), и на
    // экране он видел красный крест там, где сервер засчитывал ответ верным.
    const cue = `${question.gapBefore || ''} ${question.gapAfter || ''}`
    return { correct: answerMatches(answer, question.answers, cue) }
  }
  if (question.type === 'match') {
    const pairs = question.pairs || []
    if (pairs.length === 0 || typeof answer !== 'object') return { correct: false }
    return { correct: pairs.every((pair) => answer[pair.left] === pair.right) }
  }
  return { correct: false }
}

/** Ученик реально что-то ввёл/выбрал. Пустой «Проверить» — не попытка: ключ
 *  тогда нельзя красить зелёным, будто ответ угадали. */
export function hasAttempt(question, answer) {
  if (answer == null) return false
  if (question?.type === 'multi' || question?.type === 'order' || (question?.type === 'pick' && question?.multiple)) {
    return Array.isArray(answer) && answer.length > 0
  }
  if (question?.type === 'match') {
    return typeof answer === 'object' && !Array.isArray(answer) && Object.keys(answer).length > 0
  }
  return String(answer).trim() !== ''
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
