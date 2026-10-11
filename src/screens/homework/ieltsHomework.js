// Домашние задания IELTS на экране «Домашняя работа».
//
// Преподаватель задаёт их в web-admin («IELTS · ученики» → «Дать задание» → «Домашнее задание»), и живут они
// строками плана IELTS (origin: 'teacher', mode: 'homework'), а не в /admin/homework: у задания IELTS свой экран
// прохождения и своя проверка. Ученику же «Домашняя работа» одна — поэтому здесь задача плана приводится к форме
// карточки HomeworkList, как назначенный материал (materialAssignments.js). Задачи преподавателя «в план» без срока
// сюда не попадают: это не домашняя работа, а строка программы («Добавлено преподавателем»). Ни сети, ни React.

/** Задача плана — домашнее задание преподавателя? */
export function isIeltsHomework(task) {
  return task?.origin === 'teacher' && task?.mode === 'homework'
}

/**
 * Карточка списка из задачи плана. id с префиксом «i-», чтобы не столкнуться с числовыми id домашних работ и
 * «m-» назначенных материалов. Статусов у задачи два — заданная и выполненная: проверяет её не преподаватель, а
 * сама сдача теста (completionRule), поэтому «На проверке» у неё не бывает. Просрочку считает homeworkStateKey по
 * сроку (dueDate), а не флаг плана overdue: тот ставится по дню плана, и задание со сроком на завтра краснело бы.
 */
export function ieltsHomeworkCard(task) {
  const ex = task.extra || {}
  const done = task.status === 'completed'
  return {
    id: `i-${task.id}`,
    kind: 'ielts',
    title: ex.title || ex.testTitle || '',
    status: done ? 'COMPLETED' : 'ASSIGNED',
    done,
    dueDate: ex.dueDate || task.date || null,
    teacherName: ex.createdByName || null,
    note: ex.note || null,
    // в первую очередь — новые задания
    createdAt: ex.createdAt || task.date || '',
    task,
  }
}

/** Домашние задания IELTS из ответа /mobile/ielts/plan: новые сверху, как у обычных работ. */
export function ieltsHomeworkCards(plan) {
  const tasks = Array.isArray(plan?.tasks) ? plan.tasks : []
  return tasks
    .filter(isIeltsHomework)
    .map(ieltsHomeworkCard)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}
