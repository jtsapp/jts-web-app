// Счётчик экрана — порт newLedger из data/jtsworkbook-a0.html (:5332).
// Прототип держал его мутабельным объектом с onchange; здесь то же самое, но
// чистыми переходами: React перерисовывается по новому состоянию, а семантика
// сохранена дословно.
//
// Главное правило прототипа: балл — это доля верных С ПЕРВОЙ попытки, а не
// доля решённых. Пункт, до которого дошли перебором, засчитан как решённый,
// но в балл не идёт и попадает в «Разбор ошибок».

import { slotCount, isFree } from './engine.js'

export function createActState(act) {
  return {
    total: slotCount(act),
    free: isFree(act),
    first: 0,
    resolved: 0,
    wrong: 0,
    missed: [],
    // Решённые места: idx → true. Нужны, чтобы повторный hit не удвоил счёт.
    closed: {},
  }
}

/** Неверная попытка. Считается отдельно от вердикта: по ней открывается «показать». */
export function slip(state) {
  return { ...state, wrong: state.wrong + 1 }
}

/**
 * Место закрыто. ok — верно ли оно было решено с первой попытки.
 * Повторный вызов по тому же idx игнорируется: в прототипе место после
 * решения переставало принимать ввод, и порт обязан вести себя так же.
 */
export function hit(state, idx, ok) {
  if (state.closed[idx]) return state
  const missed = ok || state.missed.includes(idx) ? state.missed : state.missed.concat([idx])
  return {
    ...state,
    first: ok ? state.first + 1 : state.first,
    resolved: state.resolved + 1,
    missed,
    closed: { ...state.closed, [idx]: true },
  }
}

/** Экран пройден: свободные — сразу, остальные — когда закрыты все места. */
export function actDone(state) {
  return state.free || state.resolved >= state.total
}

/** Балл экрана в процентах; у экрана без судимых мест — 100. */
export function actScore(state) {
  return state.total ? Math.round((state.first / state.total) * 100) : 100
}

/* Раскрыть всё оставшееся: «показать ответы» закрывает нерешённые места как
   неверные — иначе экран нельзя было бы завершить, а балл стал бы неправдой. */
export function revealRest(state) {
  let next = state
  for (let i = 0; i < state.total; i++) next = hit(next, i, false)
  return next
}
