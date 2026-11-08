// Ступень подсказки Луны в домашке (ТЗ v2.0, 7.2б; контракт — homework-hint-contract.md, backend V543): преподаватель
// видит, на каком задании ученик брал подсказку и какой ступени; штрафа нет.
//
// Ступени по заданию копит окно (hintSteps.js: учёт задания `hw:<работа>:<задание>` в sessionStorage). Отсюда они
// уходят на сервер двумя путями:
//   - сразу, как Луна дала подсказку (`reportHomeworkHint` → PUT …/exercises/{id}/hint);
//   - при сдаче — всё, что накопилось по работе (`homeworkHintLevels` → тело PUT …/submit): если первый запрос не
//     дошёл (сеть, вкладку закрыли), ступень всё равно уйдёт. Сервер хранит максимум, повтор безопасен.
//
// В домашке ступеней две, ответа нет (hintSteps.js) — больше 2 сервер не принимает и роняет ВСЮ сдачу, поэтому
// ступень здесь режется до 2 в любом случае.

import { saveHomeworkHint } from '../../api.js'
import { hintStepFor } from './hintSteps.js'
import { homeworkHintId, parseHomeworkHintId } from './hintTask.js'

export const HOMEWORK_MAX_HINT = 2

const level = (step) => Math.max(0, Math.min(HOMEWORK_MAX_HINT, Number(step) || 0))

/**
 * Окно дало подсказку на задании домашки: ступень — на сервер сразу. Не ушла (прежний бэкенд без ручки — 404, сеть) —
 * не беда: она в учёте вкладки и уйдёт со сдачей. Вернёт промис без ошибок.
 */
export function reportHomeworkHint(taskId, step, token) {
  const hw = parseHomeworkHintId(taskId)
  const hintLevel = level(step)
  if (!hw || !hintLevel || !token) return Promise.resolve(false)
  return saveHomeworkHint(hw.homeworkId, hw.exerciseId, token, hintLevel).then(
    () => true,
    () => false,
  )
}

/** Ступени по заданиям работы для сдачи: { "<exerciseId>": 1|2 }; подсказок не было — пустой объект. */
export function homeworkHintLevels(homeworkId, exerciseIds = []) {
  const out = {}
  for (const id of exerciseIds) {
    if (id == null) continue
    const l = level(hintStepFor(homeworkHintId(homeworkId, id)))
    if (l) out[String(id)] = l
  }
  return out
}
