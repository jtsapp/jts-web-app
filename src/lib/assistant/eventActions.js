// Кнопки под ответом Луны на событие (ТЗ v2.0, промт — таблица «Что делать на каждое событие»: до трёх, первая — главное
// действие). Какие — решает таблица события (events.js, eventButtons), что именно они делают — свежий план дня
// (planSteps.daySummary): «Начать» ведёт в следующий шаг плана, «У меня мало времени» и «На сегодня всё» — только если
// бэкенд их умеет. Чистый модуль: окно (AssistantWidget) выполняет действия и подписывает кнопки.

import { breakAction, stopAction } from './actions.js'
import { eventButtons } from './events.js'
import { stepDestination } from './planSteps.js'

/**
 * @param {{type: string}} ev событие
 * @param {object|null} modelAction предложение модели (открыть раздел) — запасная первая кнопка, когда плана нет
 * @param {object|null} summary сводка дня (planSteps.daySummary)
 * @returns {object[]} действия окна, не больше трёх
 */
export function eventActions(ev, modelAction = null, summary = null) {
  const next = summary?.ready ? summary.next : null
  const out = []
  for (const name of eventButtons(ev?.type)) {
    const [kind, arg] = name.split(':')
    if (kind === 'step') {
      if (next) out.push({ kind: 'step', target: 'step', task: next, verb: arg, dest: stepDestination(summary.nextKind) })
      else if (modelAction) out.push(modelAction)
    } else if (kind === 'continue') {
      out.push({ kind: 'dismiss', target: 'continue' })
    } else if (kind === 'lowtime') {
      if (summary?.canReplan && summary.left) out.push({ kind: 'lowtime', target: 'plan' })
    } else if (kind === 'break') {
      // у «перерыв кончился» — «Ещё 5 минут», у остальных — «Перерыв 10 мин»
      out.push({ ...breakAction(Number(arg), false), more: ev.type === 'break_over' })
    } else if (kind === 'stop') {
      if (summary?.canStop) out.push({ ...stopAction(false), cant: arg === 'cant' })
    } else if (kind === 'replan') {
      // вечер — «10 минут», долгий перерыв — «План на 15 минут»
      if (summary?.canReplan && summary.left) {
        out.push({ kind: 'replan', target: 'plan', minutes: Number(arg), now: false, style: ev.type === 'evening_entry' ? 'day' : 'plan' })
      }
    } else if (kind === 'showplan') {
      if (summary?.ready) out.push({ kind: 'nav', target: 'ge-plan' })
    } else if (kind === 'practice') {
      out.push({ kind: 'open', target: 'practice', now: false, caption: 'practice' })
    } else if (kind === 'dismiss') {
      // «Я просто смотрю» — отказ: он в счёт «закрыл плашку подряд» (7.4)
      out.push({ kind: 'dismiss', target: arg, decline: arg === 'look' })
    } else if (kind === 'trial') {
      out.push({ kind: 'trial', target: 'trial' })
    }
  }
  // Ни одной кнопки дела (плана нет, бэкенд прежний) — хотя бы предложение модели первой.
  if (modelAction && !out.includes(modelAction) && !out.some((a) => a.kind !== 'dismiss')) out.unshift(modelAction)
  return out.slice(0, 3)
}
