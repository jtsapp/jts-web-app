// Что считается ответом, что кладётся по кнопке «Не знаю» и как ответ уезжает
// в движок.
//
// Модуль собрался из двух правок, пришедших с разных сторон, и обе причины
// здесь остаются:
//
// 1. Вынесено из PlacementTestPage, потому что те же правила нужны пробному
//    уроку (screens/trial/). Расхождение означало бы, что одно и то же задание
//    в тесте и на уроке оценивается по-разному — самая незаметная из возможных
//    ошибок, потому что на экране всё выглядит одинаково.
// 2. От этого же зависит блокировка «Далее»: в разделах теста нельзя было
//    двинуться дальше, не ответив, — на A0-мосту (два задания с полем ввода)
//    это был тупик, ученик обязан был что-то написать, а вынужденная догадка
//    ещё и завышает оценку.

import { scoreTfns, scoreOrderWords, scoreBankfill, scoreMatch } from './engine.generated.js'
import { orderWordsOf } from './questions.jsx'

/**
 * Черновик ответа «не знаю». Для вопросов с вариантами это -1 (тем же
 * приёмом, что и в словарном блоке бандла: ни с одним вариантом не совпадает,
 * значит движок засчитает как неверный, но в логе видно, что это отказ, а не
 * промах). Остальные поля обнуляются: частично собранный ответ не должен
 * оцениваться после того, как ученик сказал «не знаю».
 */
export const IDK_DRAFT = Object.freeze({
  idk: true,
  optIndex: -1,
  text: '',
  answers: [],
  seq: [],
  arr: [],
  gaps: [],
  map: [],
})

/**
 * Отвечено ли задание.
 *
 * [kind] — 'vocab' для словарного блока (у него свой вариант «Не знаю» прямо в
 * списке), 'item' для остальных. [orderWords] — эталон для задания на порядок
 * слов без готовых шагов; не передан — берём из самого задания, чтобы
 * вызывающие с двумя аргументами (пробный урок) работали как раньше.
 */
export function isItemAnswered(item, draft, kind = 'item', orderWords = null) {
  const d = draft || {}
  if (!item) return false
  if (kind === 'vocab') return d.optIndex != null // -1 («не знаю») — тоже ответ
  if (d.idk) return true
  if (item.type === 'tfns') return item.statements.every((_, k) => d.answers?.[k])
  if (item.type === 'order' && item.steps) return (d.seq || []).length === item.steps.length
  if (item.type === 'order') return (d.arr || []).length === (orderWords || orderWordsOf(item)).length
  if (item.type === 'bankfill') return (d.gaps || []).filter(Boolean).length === item.answers.length
  if (item.type === 'match') return (d.map || []).filter((x) => x != null).length === item.pairs.length
  return d.optIndex != null || !!(d.text || '').trim() || d.fraction != null
}

/**
 * Сдача ответа в движок — теми же score-функциями, что и бандл.
 *
 * Черновик «не знаю» отдельной ветки не требует: IDK_DRAFT обнуляет поля и
 * ставит optIndex = -1, поэтому обычный путь честно засчитает ноль, а сам
 * признак idk остаётся в черновике для лога.
 */
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
