// Состояние ответа на задании: чем считается «отвечено» и что кладётся в
// черновик по кнопке «Не знаю».
//
// Вынесено из экрана, потому что от этого зависит и блокировка «Далее», и то,
// что уедет в движок: в разделах теста нельзя было двинуться дальше, не
// ответив, — на A0-мосту (два задания с полем ввода) это был тупик, ученик
// обязан был что-то написать, а вынужденная догадка ещё и завышает оценку.

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
 * Отвечено ли задание. [kind] — 'vocab' для словарного блока (у него свой
 * вариант «Не знаю» прямо в списке), 'item' для остальных.
 * [orderWords] — эталон для задания на порядок слов без готовых шагов.
 */
export function isItemAnswered(item, draft, kind = 'item', orderWords = []) {
  const d = draft || {}
  if (kind === 'vocab') return d.optIndex != null // -1 («не знаю») — тоже ответ
  if (d.idk) return true
  if (item.type === 'tfns') return item.statements.every((_, k) => d.answers?.[k])
  if (item.type === 'order' && item.steps) return (d.seq || []).length === item.steps.length
  if (item.type === 'order') return (d.arr || []).length === orderWords.length
  if (item.type === 'bankfill') return (d.gaps || []).filter(Boolean).length === item.answers.length
  if (item.type === 'match') return (d.map || []).filter((x) => x != null).length === item.pairs.length
  return d.optIndex != null || !!(d.text || '').trim() || d.fraction != null
}
