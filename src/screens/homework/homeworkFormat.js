// Чистые правила экрана «Домашняя работа». Ни сети, ни React — под юнит-тесты.

// Те же расширения, что принимает бэкенд (HomeworkFileTypes). Дублируются
// сознательно: проверка на клиенте нужна, чтобы не гонять в хранилище файл,
// который всё равно будет отклонён при прикреплении.
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf']

export function fileExtension(fileName) {
  const name = String(fileName || '').split(/[\\/]/).pop().split('?')[0]
  const dot = name.lastIndexOf('.')
  if (dot < 0 || dot === name.length - 1) return null
  return name.slice(dot + 1).toLowerCase()
}

export function isAllowedFile(fileName) {
  const ext = fileExtension(fileName)
  return ext != null && ALLOWED_EXTENSIONS.includes(ext)
}

// Ключ статуса для подписи и цвета бейджа. Просроченным считаем только то, что
// ещё не сдано: работа, отправленная на проверку с опозданием, — уже забота
// преподавателя, и «просрочено» в ней ничего не объясняет.
export function homeworkStateKey(hw, now = new Date()) {
  if (!hw) return 'assigned'
  switch (hw.status) {
    case 'COMPLETED': return 'completed'
    case 'SUBMITTED': return 'submitted'
    case 'NEEDS_REVISION': return 'needsRevision'
    default:
      return isOverdue(hw, now) ? 'overdue' : 'assigned'
  }
}

export function isOverdue(hw, now = new Date()) {
  if (!hw?.dueDate || hw.status !== 'ASSIGNED') return false
  // dueDate — дата без времени: работа просрочена со следующего дня, а не в
  // полночь того же дня, до конца которого её ещё можно сдать.
  const [y, m, d] = String(hw.dueDate).split('-').map(Number)
  return new Date(y, m - 1, d + 1) <= now
}

/**
 * Файлы редактируются только пока работа у ученика: до сдачи (ASSIGNED) и
 * после возврата (NEEDS_REVISION). Сданная работа зафиксирована — оценка
 * должна встать под тем составом файлов, который видел преподаватель
 * (то же правило держит бэкенд, assertOpenForSubmission).
 */
export function canAttach(hw) {
  return !!hw && (hw.status === 'ASSIGNED' || hw.status === 'NEEDS_REVISION')
}

/** Отправлять на проверку нечего, пока не приложен хотя бы один файл. */
/**
 * Сколько заданий урока ученик уже решил.
 *
 * Отозванные не в счёт: их у ученика на экране нет, и требовать ответ на то,
 * чего он не видит, нельзя.
 */
export function answeredExercises(hw) {
  return (hw?.exercises || []).filter((e) => e && e.question && !e.revoked && e.studentAnswer != null).length
}

/**
 * Работу можно сдать, когда есть ЧТО сдавать.
 *
 * Раньше условие было одно: прикреплённый файл. Домашка, собранная из заданий
 * урока, файлов не имеет вовсе — ученик решал все задания подряд, а «Отправить
 * на проверку» оставалась мёртвой, и работа зависала «не выполнено» навсегда.
 *
 * Считаем сделанным и решённое задание. Не требуем решить ВСЕ: одно задание,
 * которое почему-либо не отвечается, иначе запирает всю работу — ровно та
 * ловушка, из-за которой это и чинится. Преподаватель и так видит по каждому
 * заданию, отвечено оно и засчиталось ли.
 */
export function canSubmit(hw) {
  if (!canAttach(hw)) return false
  return (hw.submissions?.length ?? 0) > 0 || answeredExercises(hw) > 0
}

/** Сколько работ ждут ученика — цифра на входе с главной. */
export function pendingCount(list) {
  return (list || []).filter((hw) => hw.status === 'ASSIGNED' || hw.status === 'NEEDS_REVISION').length
}

/** Школьная шкала: бэкенд принимает только 1–5 (GradeHomeworkRequest). */
export const GRADES = [1, 2, 3, 4, 5]

// Порядок в списке преподавателя — по тому, чья очередь действовать: сданные
// работы ждут его прямо сейчас, отправленные на доработку — ученика, а
// проверенные не ждут никого. Сортировка по дате смешала бы всё это в кучу.
const REVIEW_ORDER = { SUBMITTED: 0, ASSIGNED: 1, NEEDS_REVISION: 2, COMPLETED: 3 }

export function reviewOrder(hw) {
  return REVIEW_ORDER[hw?.status] ?? REVIEW_ORDER.ASSIGNED
}

// Порядок в списке ученика — тоже по тому, чья очередь: возвращённое на
// доработку ждёт его срочнее всего, затем просто заданное; сданное и
// проверенное не ждут ничего. Внутри группы порядок бэкенда (новые сначала)
// сохраняется — sort стабильный.
const STUDENT_ORDER = { NEEDS_REVISION: 0, ASSIGNED: 1, SUBMITTED: 2, COMPLETED: 3 }

export function studentOrder(hw) {
  return STUDENT_ORDER[hw?.status] ?? STUDENT_ORDER.ASSIGNED
}
