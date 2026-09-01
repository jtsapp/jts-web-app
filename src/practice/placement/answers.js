// Что считается ответом и как ответ уезжает в движок.
//
// Вынесено из PlacementTestPage: те же правила нужны пробному уроку
// (screens/trial/), а расхождение здесь означало бы, что одно и то же задание
// в тесте и на уроке оценивается по-разному — самая незаметная из возможных
// ошибок, потому что на экране всё выглядит одинаково.

import { scoreTfns, scoreOrderWords, scoreBankfill, scoreMatch } from './engine.generated.js'
import { orderWordsOf } from './questions.jsx'

/** Заполнено ли задание достаточно, чтобы пустить студента дальше. */
export function isItemAnswered(item, draft) {
  const d = draft
  if (!d || !item) return false
  if (item.type === 'tfns') return item.statements.every((_, k) => d.answers?.[k])
  if (item.type === 'order' && item.steps) return (d.seq || []).length === item.steps.length
  if (item.type === 'order') return (d.arr || []).length === orderWordsOf(item).length
  if (item.type === 'bankfill') return (d.gaps || []).filter(Boolean).length === item.answers.length
  if (item.type === 'match') return (d.map || []).filter((x) => x != null).length === item.pairs.length
  return d.optIndex != null || !!(d.text || '').trim() || d.fraction != null
}

/** Сдача ответа в движок — теми же score-функциями, что и бандл. */
export function submitAnswer(session, item, draft) {
  const d = draft || {}
  if (item.type === 'tfns') return session.answerGraded(item, scoreTfns(item, d.answers || []), { answers: d.answers || [], playsUsed: d.plays || 1 })
  if (item.type === 'order' && item.steps) return session.answerGraded(item, scoreOrderWords(item.steps, d.seq || []), { seq: d.seq || [], playsUsed: d.plays || 1 })
  if (item.type === 'order') return session.answerGraded(item, scoreOrderWords(orderWordsOf(item), d.arr || []), { built: (d.arr || []).join(' ') })
  if (item.type === 'bankfill') return session.answerGraded(item, scoreBankfill(item, d.gaps || []), { gaps: (d.gaps || []).slice() })
  if (item.type === 'match') return session.answerGraded(item, scoreMatch(item, d.map || []), { map: (d.map || []).slice() })
  if (d.fraction != null) return session.answerGraded(item, d.fraction, { playsUsed: d.plays || 1 })
  return session.answer(item, {
    optIndex: d.optIndex ?? null,
    text: d.text || '',
    tMs: d.tMs || 0,
    shownOrder: d.shownOrder || null,
    playsUsed: d.plays || null,
  })
}
