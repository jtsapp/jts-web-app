/** Skip React setState when a 5s poll returned the same lesson/chat snapshot.
 *  A new object every tick remounts word-bank HTML and blanks the gaps. */

export function sameMessageSnapshot(prev, next) {
  if (prev === next) return true
  if (!prev || !next || prev.length !== next.length) return false
  return prev.every((m, i) => m.id === next[i].id && m.body === next[i].body)
}

export function sameLessonSnapshot(prev, next) {
  if (prev === next) return true
  if (!prev || !next) return false
  if (prev.id !== next.id) return false
  if (prev.status !== next.status) return false
  if ((prev.meetingUrl || null) !== (next.meetingUrl || null)) return false
  if (prev.teacherId !== next.teacherId) return false
  if (prev.teacherName !== next.teacherName) return false
  if (prev.title !== next.title) return false
  if (prev.durationMinutes !== next.durationMinutes) return false
  // Поля, которые рисуют шапку урока и вкладку «Группа». Без них поллинг
  // отбрасывал свежий ответ: преподаватель прикреплял материал, а у ученика
  // шапка до конца урока показывала запасное «Живой урок».
  if ((prev.topic || null) !== (next.topic || null)) return false
  if ((prev.groupName || null) !== (next.groupName || null)) return false
  if (prev.lessonType !== next.lessonType) return false
  const a = prev.participants || []
  const b = next.participants || []
  if (a.length !== b.length) return false
  // Статус участника решает, показывать ли его в составе класса: отменившийся
  // ученик иначе остаётся в списке до перезагрузки страницы.
  return a.every((p, i) => p.studentId === b[i].studentId
    && p.studentName === b[i].studentName
    && p.status === b[i].status)
}
