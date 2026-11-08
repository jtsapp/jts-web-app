// Активное задание для ступеней подсказки (hintSteps.js): что за задание у ученика под рукой, в каком режиме и — только
// у практики — как взять его ключ. Регистрирует раздел, а не окно: по снимку экрана не понять, одно это задание или
// пять (в домашке их на экране десяток), и ключа в снимке нет намеренно — модель видела бы его на каждом вопросе.
//
//   плеер урока «Обучения» (CourseStepPlayer) — шаг урока, practice (тест юнита — test), ключ — expectedAnswer(step);
//   домашка (HomeworkExercises) — задание, которого ученик коснулся последним, homework (тест юнита — test), без ключа.
//
// Раздел без регистрации — режим по экрану: тест (data-assistant-test) или практика, задание — сам экран, ключа нет.
// Ключ отдаётся только через keyFor — и только для practice: домашка и тест его сюда не кладут вовсе.

let current = null // { id, mode, getKey? }

/** id задания домашки — один на окно Луны и на сохранение ответа (там ступень уходит преподавателю). */
export const homeworkHintId = (homeworkId, exerciseId) => `hw:${homeworkId}:${exerciseId}`

/** Раздел сообщает активное задание. getKey — только для practice. */
export function setHintTask({ id, mode, getKey = null }) {
  if (!id || !mode) return
  current = { id: String(id), mode, getKey: mode === 'practice' && typeof getKey === 'function' ? getKey : null }
}

/** Задание ушло с экрана. id — чтобы уходящий экран не снял уже пришедшее следом. */
export function clearHintTask(id) {
  if (!current || (id != null && current.id !== String(id))) return
  current = null
}

/** Активное задание без ключа: { id, mode } или null. */
export function hintTask() {
  return current ? { id: current.id, mode: current.mode } : null
}

/** Ключ задания id — только у практики и только если это всё ещё активное задание. */
export function keyFor(id) {
  if (!current || current.id !== String(id) || current.mode !== 'practice' || !current.getKey) return null
  try {
    const key = String(current.getKey() ?? '').replace(/\s+/g, ' ').trim()
    return key ? key.slice(0, 300) : null
  } catch {
    return null
  }
}
