import { replanGeDay } from '../../api.js'
import { pluralForm } from '../../lib/plural.js'
import { minutesLabel, taskTitle, todayView } from './planModel.js'

export { canReplan } from './ownTasks.js'

// «У меня мало времени» (ТЗ v2.0 Луна-трекер, 5.2 и 9.1): ученик выбирает 10/20/30 минут — бэкенд пересобирает
// сегодняшний день (POST /mobile/ge/plan/replan, backend docs/ge/PLAN.md), а что не влезло, уходит на следующий
// учебный день. Зовут его «Сегодня» на «Главной» и Луна (метка [[REPLAN N]]), поэтому после ответа всем экранам с
// планом уходит событие: «Главная» перечитывает план, даже если пересобрала его Луна из своего окна.

export const GE_PLAN_CHANGED = 'jts:ge-plan-changed'
export const LOW_TIME_CHOICES = [10, 20, 30]

/** Пересобрать сегодня под minutes (null — обычный план). Плана нет или сбой — исключение: экран покажет «не вышло». */
export async function replanToday(token, minutes) {
  const plan = await replanGeDay(token, minutes || null)
  if (!plan || plan.state !== 'ready') throw new Error('ge plan: no plan')
  try {
    window.dispatchEvent(new CustomEvent(GE_PLAN_CHANGED))
  } catch {
    // без window (тесты на node) событие слать некому
  }
  return plan
}

/**
 * Итог пересчёта словами — для Луны, из ответа сервера, без модели: модель отвечает раньше, чем план пересобран, и
 * перечислить новый день могла бы только выдумав его. Курсы — без названия урока: тропы у окна Луны нет.
 */
export function replanSummary(t, lang, plan) {
  const minutes = plan?.shortDay?.minutes
  if (!minutes) return t('assistant.replan.restored')
  const open = todayView(plan).tasks.filter((x) => x.status !== 'completed')
  const parts = [t('assistant.replan.done', { n: String(minutes) })]
  if (open.length) parts.push(t('assistant.replan.left', { list: open.map((x) => `${taskTitle(t, x, null)} (${minutesLabel(t, x)})`).join(', ') }))
  const moved = (plan.tasks || []).filter((x) => x.deferred).length
  if (moved) parts.push(t(`assistant.replan.moved.${pluralForm(moved, lang)}`, { n: String(moved) }))
  return parts.join(' ')
}
