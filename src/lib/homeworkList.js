// Домашка ученика из тех же источников, что раздел «Домашняя работа» (HomeworkPage):
// домашние работы (/admin/homework/my) и задания, выданные с урока (/student/assignments).
// Один модуль — для «Главной», раздела и Луны (lib/assistant/studentContext.js): раньше
// «Главная» не грузила выданные материалы и писала «Заданий нет — всё сделано» при
// просроченном материале, а Луна видела только работы со сроком на 4 дня вперёд
// (аудит ТЗ v2.0, 06.11.2026: «у вас одна домашка» при трёх в разделе).
//
// Статус и просрочку считает homeworkStateKey — то же правило, что бейджи раздела.
// Модуль чистый (без React и сети): его берёт и сервер.

import { homeworkStateKey } from '../screens/homework/homeworkFormat.js'

/**
 * Поля карточки задания с урока, общие для списка раздела, «Главной» и Луны
 * (materialAssignments.materialCard добавляет к ним само назначение).
 */
export function materialCardBase(a) {
  return {
    // Префикс «m-», чтобы не столкнуться с числовыми id домашних работ.
    id: `m-${a.id}`,
    kind: 'material',
    // Задали одну карточку урока — она и есть название задания: «Unit 3» про одну
    // карточку из тридцати не сообщает ученику ничего.
    title: a.cardTitle || a.materialTitle,
    // Статус и просрочку считает СЕРВЕР (MaterialAssignmentService.statusOf): по работе,
    // которая решается прямо в уроке, вложений не бывает, и своё правило клиента врало.
    status: a.status,
    isOverdue: a.isOverdue,
    dueDate: a.dueDate ?? null,
    grade: a.teacherScore ?? null,
    // Закрыто без сдачи — не «Проверено» (spec §5.7).
    closedWithoutSubmission: a.closedWithoutSubmission,
  }
}

/**
 * Все работы ученика одним списком: работы и выданные с урока. Выдача с
 * homeworkAssignmentId уже лежит внутри своей работы (одна домашка на занятие) —
 * отдельной карточкой она задвоилась бы.
 */
export function homeworkCards(homework, assignments) {
  const rows = Array.isArray(homework) ? homework : []
  const unattached = (Array.isArray(assignments) ? assignments : []).filter((a) => a && !a.homeworkAssignmentId)
  return [...rows, ...unattached.map(materialCardBase)]
}

// Что ждёт ученика: заданное, просроченное, возвращённое на доработку.
export const OPEN_STATES = new Set(['assigned', 'overdue', 'needsRevision'])

/** Карточки со статусом раздела (homeworkStateKey). */
export function withStates(cards, now = new Date()) {
  return (cards || []).map((hw) => ({ ...hw, state: homeworkStateKey(hw, now) }))
}

const dueTime = (h) => {
  const t = h?.dueDate ? Date.parse(h.dueDate) : NaN
  return Number.isFinite(t) ? t : Infinity
}

/** Открытые работы: просроченные и ближайший срок первыми, без срока — в конце. */
export function openHomework(cards, now = new Date()) {
  return withStates(cards, now)
    .filter((h) => OPEN_STATES.has(h.state))
    .sort((a, b) => dueTime(a) - dueTime(b))
}

// Значок пункта меню «Домашняя работа» (ТЗ v2.0, 5.4): просроченные и заданные. «На доработку» — тоже задано: работа
// снова ждёт ученика (OPEN_STATES). Сданное и проверенное в значок не идёт — с ним ученику делать нечего.

/** Сколько работ ждут ученика — число на значке меню. */
export function homeworkBadgeCount(cards, now = new Date()) {
  return withStates(cards, now).filter((h) => OPEN_STATES.has(h.state)).length
}
