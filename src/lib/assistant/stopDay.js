import { stopGeDay } from '../../api.js'
import { pluralForm } from '../plural.js'
import { GE_PLAN_CHANGED } from '../../ge/plan/replan.js'

// «На сегодня всё» (ТЗ v2.0, 7.2 событие day_stopped): бэкенд засчитывает сделанное, а оставшиеся свои задачи дня переносит
// на следующий учебный день (POST /mobile/ge/plan/stop-day, backend docs/ge/PLAN.md). Механика и отметка — те же, что у
// «мало времени», поэтому «Нет, продолжу» — это [[REPLAN_NOW 0]]: обычный план снимает и стоп.
//
// Итог пишет окно по ответу сервера, как у replanSummary: модель отвечает раньше, чем день остановлен, и перечислить
// перенесённое могла бы, только выдумав его. Напоминаний на сайте нет — итог их не обещает (ТЗ 7.4).

/** Остановить сегодня. Плана нет или сбой — исключение: окно скажет «не вышло». */
export async function stopToday(token) {
  const plan = await stopGeDay(token)
  if (!plan || plan.state !== 'ready') throw new Error('ge plan: no plan')
  try {
    window.dispatchEvent(new CustomEvent(GE_PLAN_CHANGED))
  } catch {
    // без window (тесты на node) событие слать некому
  }
  return plan
}

/** Итог «На сегодня всё» словами — из ответа сервера (stop: { done, moved }). */
export function stopSummary(t, lang, plan) {
  const done = Number(plan?.stop?.done) || 0
  const moved = Number(plan?.stop?.moved ?? plan?.stopDay?.moved) || 0
  const parts = [done ? t(`assistant.stop.done.${pluralForm(done, lang)}`, { n: String(done) }) : t('assistant.stop.noneDone')]
  parts.push(moved ? t(`assistant.stop.moved.${pluralForm(moved, lang)}`, { n: String(moved) }) : t('assistant.stop.nothingMoved'))
  return parts.join(' ')
}
