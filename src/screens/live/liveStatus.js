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
 * Кто не отвечает на задания урока — только преподаватель: он читает работу
 * ученика, а не решает за него.
 *
 * Статус урока сюда больше не входит. Раньше перерыв и завершение закрывали
 * ответы «чтобы работа не дописывалась задним числом»; с 20.09.2026 урок для
 * ученика открыт всегда (spec-lesson-always-open), и единственное закрытое
 * полотно — преподавательское.
 */
export function contentLocked(isStaff) {
  return Boolean(isStaff)
}
