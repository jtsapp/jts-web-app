// Режим ответа Луны для журнала оценок (ТЗ v2.0, 8.5): учитель, сайт, событие или подсказка. Считается по вопросу
// теми же разборщиками служебных ходов, что у роута чата, — роут чата режим не отдаёт (спека
// 2026-11-08-luna-answer-rating-design.md: там параллельно ставят свою модель учителю, и правка роута оценкой — одна
// строка). Только сервер: справка по грамматике тяжёлая, окну она ни к чему.

import { parseEventMark } from './events.js'
import { parseHintMark } from './hintSteps.js'
import { isOpeningTurn, stuckReason } from './opening.js'
import { isEnglishQuestion } from './grammarRef.js'

/**
 * @returns {{ mode: 'teacher'|'site'|'event'|'hint', opening: boolean, event: string|null }}
 *   opening — служебный ход, а не слова ученика; event — тип события «Луна пишет первой»
 */
export function answerMode(question) {
  const q = String(question ?? '').trim()
  const ev = parseEventMark(q)
  if (ev) return { mode: 'event', opening: true, event: ev.type }
  if (parseHintMark(q) || stuckReason(q)) return { mode: 'hint', opening: true, event: null }
  // Первая реплика окна и ответ на позывной — Луна-куратор сайта.
  if (isOpeningTurn(q)) return { mode: 'site', opening: true, event: null }
  return { mode: isEnglishQuestion(q) ? 'teacher' : 'site', opening: false, event: null }
}
