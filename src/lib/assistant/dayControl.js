// «На сегодня всё» (ТЗ v2.0, 7.2 событие day_stopped; решение владельца 2 — метка [[STOP_DAY]]): умеет ли бэкенд остановить
// день. Модуль без импортов: его берут и окно, и серверный профиль Луны (contextLines.js), как ownTasks.canReplan.

/**
 * Бэкенд с ручкой POST /mobile/ge/plan/stop-day отдаёт в плане поле stopDay всегда (null — день не остановлен). Без поля
 * бэкенд прежний: кнопки «На сегодня всё» нет и Луне метку не даём — иначе ученик получал бы «не вышло» на каждое нажатие.
 */
export function canStopDay(plan) {
  return Boolean(plan && plan.state === 'ready' && Object.prototype.hasOwnProperty.call(plan, 'stopDay'))
}

/** Строка профиля, когда остановить день нельзя: по ней turnHints не даёт метку [[STOP_DAY …]]. */
export const STOP_OFF = 'Закончить день кнопкой «На сегодня всё» сейчас нельзя.'
