// План дня глазами Луны-трекера (ТЗ v2.0, 7.1–7.2): сколько шагов, сколько осталось, какой следующий и куда ведёт
// «Начать». Те же задачи, что блок «Сегодня» на «Главной» (todayView: свои задачи плана, просроченное этой недели), —
// иначе Луна говорила бы «осталось 3», а под ней было бы 2.

import { MODULES, taskRoute, todayView } from '../../ge/plan/planModel.js'
import { canReplan } from '../../ge/plan/ownTasks.js'
import { canStopDay } from './dayControl.js'

/** Вид шага для пометки события: урок курса или модуль практики (events.js, STEP_KINDS). */
export function stepKind(task) {
  if (task?.kind === 'course') return 'course'
  return MODULES.includes(task?.module) ? task.module : 'practice'
}

// Раздел, куда ведёт шаг, — для метки в истории разговора: на «да» модель должна видеть, что предлагалось (actions.js).
const STEP_DEST = {
  course: 'learning',
  ai_tutor: 'tutor',
  workbooks: 'workbooks',
  shadowing: 'shadowing',
  media_practice: 'practice-reading',
  vocabulary_sr: 'vocab',
  practice: 'practice',
}
export const stepDestination = (kind) => STEP_DEST[kind] || 'practice'

/** Сколько минут ещё нужно задаче: у начатой практики — без набранного. */
const minutesLeft = (x) => Math.max(0, (Number(x.minutes) || 0) - (x.kind === 'practice' ? Number(x.got) || 0 : 0))

/**
 * Сводка дня по свежему плану. ready=false — плана по дням нет (ручки нет, анкета не пройдена, IELTS).
 * @returns {import('./proactive.js').DaySummary & { canReplan?: boolean, canStop?: boolean, stopped?: boolean }}
 */
export function daySummary(plan) {
  if (!plan || plan.state !== 'ready' || !Array.isArray(plan.tasks)) return { ready: false }
  const tasks = todayView(plan).tasks
  const open = tasks.filter((x) => x.status !== 'completed')
  const done = tasks.filter((x) => x.status === 'completed')
  const next = open[0] || null
  return {
    ready: true,
    total: tasks.length,
    done: done.length,
    left: open.length,
    min: open.reduce((s, x) => s + minutesLeft(x), 0),
    started: open.some((x) => x.status === 'in_progress' || Number(x.got) > 0),
    next,
    nextKind: next ? stepKind(next) : null,
    nextMin: next ? minutesLeft(next) : null,
    doneMin: done.reduce((s, x) => s + (Number(x.minutes) || 0), 0),
    completed: new Set(done.map((x) => String(x.id))),
    kinds: new Map(tasks.map((x) => [String(x.id), stepKind(x)])),
    canReplan: canReplan(plan),
    canStop: canStopDay(plan) && open.length > 0,
    stopped: Boolean(plan.stopDay),
  }
}

/**
 * Куда ведёт «Начать» у шага: ключ handleNav App и его payload — то же, что у кнопки задачи в «Сегодня» (taskRoute).
 * lesson — код шага тропы для урока курса (courseLessons), без него — тропа уровня.
 */
export function stepRoute(task, level, lesson = null) {
  return taskRoute(task, level, lesson)
}
