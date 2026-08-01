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

export function canJoinLive(lessonStatus) {
  return lessonStatus === 'IN_PROGRESS' || lessonStatus === 'PAUSED'
}
