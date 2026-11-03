// Отметка «шаг выбора учителя показан». Отдельно от экрана: App спрашивает её при каждом входе, а тянуть ради этого чанк
// экрана подбора незачем.
const seenKey = (id) => `jts_teacher_pick_seen:${id}`

export function teacherPickSeen(studentId) {
  try {
    return localStorage.getItem(seenKey(studentId)) === '1'
  } catch {
    return true
  }
}

export function markTeacherPickSeen(studentId) {
  localStorage.setItem(seenKey(studentId), '1')
}
