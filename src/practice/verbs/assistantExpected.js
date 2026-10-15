// Эталон задания «Глаголов» для помощника по сайту (data-assistant-expected на разборе ответа). Разбор и так пишет
// верные формы, но без меток: «↻ Попробовать ещё · was / were» не говорит помощнику, какая это форма и к какому полю,
// а у устного ответа строка формы ещё и стоит рядом с «Не распознано». Ключ отдаётся только после проверки с ошибкой —
// до неё помощник даёт лишь подсказки — и не после «Показать ответ»: показанное ученик уже видит как ответ сайта.

import { formsOf } from './engine.js'

// Форма — по номеру (V1 = 0), со всеми вариантами («was / were»): засчитывается любой из них, и помощнику незачем
// поправлять ученика, написавшего were.
const keyOf = (verb, indices) => indices.map((i) => `V${i + 1} → ${formsOf(verb)[i]}`).join('; ')

/**
 * Письменный ответ: «V2 → was / were; V3 → been», в предложении и исправлении — одно поле («V2 → went»).
 * @param result  snap.result письменного задания
 * @param fields  drill.fields() — номер формы у каждого поля
 */
export function writtenExpected(result, fields) {
  if (!result || result.kind !== 'written' || result.revealed) return ''
  const rows = result.score.results
  if (rows.every((r) => r.heard)) return ''
  // Ответ поля — из результата: у исправления это слово задания (item.answer), а не форма глагола из таблицы.
  return fields.map((f, i) => `V${f.form + 1} → ${rows[i] ? rows[i].form : f.answer}`).join('; ')
}

/**
 * Устный ответ (ритм и пропуск): формы, которые надо было сказать. Самопроверка («я повторил», «показать ответ»)
 * ключа не несёт — там ничего не распознавали и ошибки нет.
 * @param result  snap.result
 * @param snap    снимок попытки: verb, mode, formCount, gap
 */
export function spokenExpected(result, { verb, mode, formCount, gap }) {
  if (!result || result.kind !== 'speech' || !result.score || !verb) return ''
  if (result.score.results.every((r) => r.heard)) return ''
  const indices = mode === 'gap' ? [gap] : Array.from({ length: formCount }, (_, i) => i)
  return keyOf(verb, indices)
}
