// Сдача урока каталога, заданного на дом целиком. Ни сети, ни React — под
// юнит-тесты: цена ошибки тут — процент, который увидит преподаватель.
import { gradeQuestion, hasAttempt } from './practiceGrading.js'

/** Типы урока каталога, которые кабинет ведёт как юнит-тест. */
const UNIT_TEST_TYPES = new Set(['review', 'test'])

/**
 * Юнит-тест это или обычный урок.
 *
 * <p>Оба типа, а не один: наш конвертер эмитит только `rev` (парсер бэкенда
 * раскладывает его как `review`), а `test` остаётся на случай курсов, залитых
 * не им. Регистр приводим — бэкенд отдаёт имя enum'а («REVIEW»).
 */
export function isUnitTestType(type) {
  return UNIT_TEST_TYPES.has(String(type ?? '').toLowerCase())
}

/**
 * Все проверяемые вопросы урока, по всем шагам подряд.
 *
 * <p>Только practice-блоки: info/theory/vocab вопросов не несут. Пропуски
 * word-bank, живущие прямо в разметке блока (`html`), сюда не попадают — их
 * проверяет gradeWordBankInRoot по ЖИВОМУ DOM, и чистой функции они недоступны.
 * Процент от этого занижается на cloze-упражнениях; по решению владельца он
 * подсказка преподавателю, а не приговор, и оценку всё равно ставит он.
 */
export function lessonQuestions(lesson) {
  return (lesson?.steps || [])
    .flatMap((step) => (step?.blocks || []).filter((b) => b?.type === 'practice'))
    .flatMap((block) => block?.questions || [])
}

/**
 * Пара для сдачи: сколько верно из скольких.
 *
 * <p>`total` — ВСЕ вопросы урока, а не только отвеченные. Считай мы по
 * отвеченным, один верный ответ из 54 давал бы 100%, и преподаватель получал бы
 * отличный процент от ученика, который теста не проходил.
 *
 * <p>Вердикт берём у gradeQuestion и своего правила не заводим: этой же
 * функцией считает сдачу домашка, и разный вердикт на двух экранах ученик
 * прочитал бы как поломку. У вопросов без эталона (`manual`) `correct` означает
 * «ответ дан» — так же, как их засчитывает домашка.
 */
export function countLessonAnswers(lesson, answers = {}) {
  const questions = lessonQuestions(lesson)
  let correct = 0
  for (const question of questions) {
    if (gradeQuestion(question, answers?.[question.id]).correct) correct++
  }
  return { correct, total: questions.length }
}

/**
 * Сколько вопросов ученик реально тронул.
 *
 * <p>По этому числу оживает кнопка сдачи: пустая сдача ставит «сдано» на
 * работе, в которой преподавателю нечего проверять, а переоткрыть её ученик сам
 * не может — сдача одна.
 */
export function answeredCount(lesson, answers = {}) {
  return lessonQuestions(lesson).filter((q) => hasAttempt(q, answers?.[q.id])).length
}
