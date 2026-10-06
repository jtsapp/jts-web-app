// Правило следования за классом — чистая функция над состоянием занятия
// (спека live-lesson-server-state §4.3).
//
// Раньше «куда вести ученика» собиралось из разрозненных событий focus на
// клиенте (onFocus / applyTeacherPointer / followMode) и было написано дважды —
// здесь и в web-admin. Теперь сервер хранит состояние целиком, а клиент решает
// по нему одной функцией. Та же таблица, в том же порядке проверок, стоит у
// ученика в web-admin: менять одну сторону без другой нельзя.

/** Поля, из которых складывается «где класс». Таймер и статус сюда не входят. */
const POSITION_FIELDS = ['sectionId', 'materialId', 'stepId', 'questionId', 'focusView', 'stageIndex']

/**
 * Сменилась ли позиция класса. Пустое поле и отсутствующее — одно и то же:
 * сервер вправе не прислать `null`, и это не переход.
 */
export function positionChanged(prev, next) {
  return POSITION_FIELDS.some((field) => (prev?.[field] ?? null) !== (next?.[field] ?? null))
}

/**
 * Следовать ли за классом после пришедшего состояния и идти ли к его позиции.
 *
 * @param {{following: boolean, focusSeq: number|null}} local что клиент уже применил
 * @param {object|null} prev предыдущее применённое состояние (null до первого)
 * @param {object} next пришедшее состояние, уже прошедшее фильтр версии
 * @returns {{following: boolean, focusSeq: number, go: boolean}}
 *
 * Первое совпадение решает — порядок проверок и есть правило:
 * 1. вход: следует тот, кого застали за ведением;
 * 2. явная указка (вырос focusSeq) тянет и того, кто ушёл сам;
 * 3. ведение снято — ученик остаётся на месте;
 * 4. следующего ведёт за каждой сменой позиции (стадия меняется без указки);
 * 5. иначе ничего.
 *
 * `go` при пустой позиции (sectionId == null) — не ошибка: идти некуда, и
 * клиент просто ничего не делает.
 */
export function nextFollow(local, prev, next) {
  const focusSeq = next.focusSeq
  if (prev === null) {
    const following = Boolean(next.leading)
    return { following, focusSeq, go: following }
  }
  if (next.focusSeq > local.focusSeq) return { following: true, focusSeq, go: true }
  if (!next.leading) return { following: false, focusSeq, go: false }
  if (local.following && positionChanged(prev, next)) return { following: true, focusSeq, go: true }
  return { following: local.following, focusSeq, go: false }
}

/**
 * Событие показа — «Перенести ученика сюда» на задание или блок (мост шлёт его как
 * `eventType: 'point'`). Автоуказка при открытии выдачи его не шлёт (silent), поэтому это
 * всегда осознанное действие преподавателя, а не клик по странице.
 */
export function isPointEvent(event) {
  return event?.eventType === 'point'
}

/**
 * Пачка показа — указка «Перенести ученика сюда», а не поток класса: в ней только
 * события 'point'. Снимок рамки преподавателя тоже несёт прошлые указки (мост пишет
 * их в историю), но вперемешку с кликами и с прокруткой последним событием — это
 * показ, и переносить ученика по нему нельзя.
 */
export function isPointerBatch(events) {
  return Array.isArray(events) && events.length > 0 && events.every(isPointEvent)
}

