export function statusKey(lessonStatus) {
  switch (lessonStatus) {
    case 'IN_PROGRESS': return 'inProgress'
    case 'PAUSED': return 'paused'
    case 'COMPLETED': return 'completed'
    case 'CANCELLED': return 'cancelled'
    default: return 'scheduled'
  }
}

// Only staff drive the lesson lifecycle; a STUDENT gets a read-only view.
export function canControl(role) {
  return role === 'TEACHER' || role === 'ADMIN' || role === 'MANAGER'
}

/**
 * Когда полотно урока перестаёт принимать ответы: перерыв, завершённый урок —
 * или преподаватель, который смотрит работу ученика, а не решает за него.
 */
export function contentLocked(lessonStatus, isStaff) {
  return Boolean(isStaff) || lessonStatus === 'PAUSED' || lessonStatus === 'COMPLETED'
}

/**
 * Ключ строки «почему ответы закрыты» — она пишется в самой карточке задания.
 *
 * Баннер перерыва и завершения висит наверху страницы: ученик, доскроллив до
 * упражнения, его уже не видит и жмёт варианты, которые молча не нажимаются.
 * Причина и признак блокировки должны считаться из одного места, иначе
 * разъедутся — отсюда пара с `contentLocked`.
 *
 * Преподавателю строки нет: у него урок закрыт всё занятие, и повтор на каждой
 * карточке был бы шумом — ему хватает того, что варианты выглядят закрытыми.
 */
export function contentLockNoteKey(lessonStatus, isStaff) {
  if (isStaff) return ''
  if (lessonStatus === 'PAUSED') return 'lesson.ws.lockedPaused'
  if (lessonStatus === 'COMPLETED') return 'lesson.ws.lockedFinished'
  return ''
}

export { canJoin as canJoinLive } from '../schedule/lessonFormat.js'
