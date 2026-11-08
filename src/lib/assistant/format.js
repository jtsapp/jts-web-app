// Формат обучения ученика для Луны: с преподавателем, Self Study или демо (ТЗ v2.0, 4.2).
// От него зависят роль Луны (куратор между уроками или «и преподаватель, и куратор»),
// готовые вопросы под полем (кейс 44: у Self Study и демо нет «Как перенести урок?» и
// «Где мои домашки?») и ответ на «как перенести урок».
//
// Источник — тот же, что у меню: /cabinet/my-sections (тариф и формат подтверждённого
// абонемента, StudentFormat бэкенда: INDIVIDUAL | PAIR | GROUP | SELF), а демо — признак
// аккаунта из /user/me (isDemoAccount). Своего правила тут нет: меню и Луна не должны
// расходиться в том, есть ли у ученика уроки.
//
// Модуль чистый и общий: роут кладёт строку в профиль (studentContext.js), окно — выбирает
// готовые вопросы (AssistantWidget.jsx).

/** @typedef {'with_teacher'|'self_study'|'demo'} LearnerFormat */

const TEACHER_KIND = { INDIVIDUAL: 'индивидуально', PAIR: 'в паре', GROUP: 'в группе' }

/**
 * Формат ученика или null, если он неизвестен (абонемента нет, ответ не пришёл).
 * Демо сильнее абонемента: у демо-аккаунта его и не бывает, а меню и плашки живут по демо.
 * @param {{ demo?: boolean, sections?: {known?: boolean, format?: string|null}|null }} args
 * @returns {LearnerFormat|null}
 */
export function learnerFormat({ demo = false, sections = null } = {}) {
  if (demo) return 'demo'
  if (!sections?.known) return null
  const f = String(sections.format || '').toUpperCase()
  if (f === 'SELF') return 'self_study'
  return TEACHER_KIND[f] ? 'with_teacher' : null
}

/** Строка профиля для модели; формат неизвестен — null (правило — «не утверждай, что уроки есть»). */
export function formatLine({ demo = false, sections = null } = {}) {
  const format = learnerFormat({ demo, sections })
  if (format === 'demo') return 'Формат обучения: демо-доступ — пробный доступ к платформе, абонемента ещё нет.'
  if (format === 'self_study') return 'Формат обучения: Self Study — самостоятельно, без уроков с преподавателем и без домашки от него.'
  if (format === 'with_teacher') {
    const kind = TEACHER_KIND[String(sections.format).toUpperCase()]
    return `Формат обучения: с преподавателем (${kind}) — есть уроки по расписанию и домашка от преподавателя.`
  }
  return null
}
