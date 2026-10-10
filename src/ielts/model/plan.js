// Задача плана дня с бэкенда → строка «План на день»: подпись, «почему именно это» и куда ведёт «Начать». Подписи —
// словарь макета (ieltsDash.p.today.*), типы вопросов — подписи диагностики (ieltsOb.p.diag.types.*).

const SECTION_NAME = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' }

/**
 * Куда ведёт задача: экран App (`screen`) или вид хаба (`hub`). Слабый тип и повторение — в задания своей секции;
 * Writing — Task 2, Speaking — Part 1; mock — «Пробные тесты»; отправка преподавателю — «Мои работы» Writing.
 */
export function taskTarget(task) {
  switch (task.kind) {
    case 'diagnostic':
      return { screen: 'ielts-diagnostic' }
    case 'weakType':
    case 'review':
      return { hub: { tab: 'learn', view: task.section === 'listening' ? 'listening-tasks' : 'types' } }
    case 'writing':
      return { hub: { tab: 'learn', view: 'writing-task2' } }
    case 'speaking':
      return { hub: { tab: 'learn', view: 'speaking-part1' } }
    case 'mock':
      return { hub: { tab: 'mocks' } }
    case 'spelling':
      return { hub: { tab: 'learn', view: 'listening-spelling' } }
    case 'teacher':
      return { hub: { tab: 'learn', view: 'writing-works' } }
    default:
      return { hub: { tab: 'learn' } }
  }
}

export function planTaskView(task, t) {
  const P = (k, v) => t(`ieltsDash.p.today.${k}`, v)
  const typeName = task.type ? t(`ieltsOb.p.diag.types.${task.type}`) : P('task.anyType')
  const section = SECTION_NAME[task.section] || ''
  const params = task.params || {}
  let title
  let reason
  switch (task.kind) {
    case 'weakType':
      title = P('task.weakType', { section, type: typeName })
      reason = params.untrained ? P('task.weakTypeWhyNew') : P('task.weakTypeWhy')
      break
    case 'review':
      title = P('task.review', { section, type: typeName })
      reason = P('task.reviewWhy', { n: String(params.days ?? '') })
      break
    case 'mock':
      title = P('task.mock')
      reason = P('task.mockWhy', { n: String(params.n ?? '') })
      break
    case 'teacher':
      title = P('task.teacher')
      reason = P('task.teacherWhy', { route: t(`ieltsOb.route.${params.route || 'mix'}`) })
      break
    default:
      title = P(`task.${task.kind}`)
      reason = P(`task.${task.kind}Why`)
  }
  return {
    id: task.id,
    kind: task.kind,
    section: task.section || (task.kind === 'diagnostic' || task.kind === 'mock' ? 'reading' : task.kind),
    title,
    reason,
    minutes: task.minutes,
    done: !!task.done,
    offPlatform: !!task.offPlatform,
    target: taskTarget(task),
  }
}
