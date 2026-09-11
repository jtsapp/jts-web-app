// Задания с живых уроков (MaterialAssignment) на экране «Домашняя работа».
//
// Это не вторая домашка, а существующий инструмент преподавателя «задать
// материал как ДЗ» из админки. Здесь назначение приводится к форме карточки
// HomeworkList (id/title/status/dueDate/grade), чтобы жить в одном списке с
// обычными работами: у ученика одна «Домашняя работа», а не два раздела про
// одно и то же. Ни сети, ни React — под юнит-тесты.

/** Оценено ли назначение преподавателем (у него нет статусной машины ДЗ). */
export function isMaterialGraded(a) {
  return a?.gradedAt != null || a?.teacherScore != null
}

/**
 * Карточка списка из назначения. id с префиксом «m-», чтобы не столкнуться с
 * числовыми id домашних работ; статус сводится к паре ASSIGNED/COMPLETED —
 * промежуточных состояний у назначения нет, а бейджи и просрочку по dueDate
 * дальше считает homeworkStateKey, как у обычной работы.
 */
export function materialCard(a) {
  return {
    id: `m-${a.id}`,
    kind: 'material',
    title: a.materialTitle,
    status: isMaterialGraded(a) ? 'COMPLETED' : 'ASSIGNED',
    dueDate: a.dueDate ?? null,
    grade: a.teacherScore ?? null,
    assignment: a,
  }
}

/** Интерактив открывается через render-эндпоинт (с bridge-скриптом), остальное — прямой файл. */
export function isInteractiveMaterial(a) {
  return a?.materialType === 'INTERACTIVE_HTML'
}
