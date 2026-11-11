// Шаги проверки под формой, пока идёт запрос публикации (спека 2026-11-11 §7, прототип .pipe/.step). Шаги — витрина
// того, что делает сервер (§3.1); настоящего хода проверки ответ не сообщает, поэтому они тикают по таймеру, а ответ
// закрывает оставшиеся. Шаг фото — только когда фото есть.

export const STEP_MS = 550

export function checkSteps(photoCount) {
  return [
    ...(photoCount > 0 ? [{ id: 'photo', key: 'birge.step.photo', vars: { n: photoCount } }] : []),
    { id: 'dict', key: 'birge.step.dict', vars: {} },
    { id: 'ai', key: 'birge.step.ai', vars: {} },
    { id: 'rules', key: 'birge.step.rules', vars: {} },
  ]
}

/**
 * Состояние шагов: по одному в такт; последний крутится, пока нет ответа (закрыть его раньше — значит соврать, что
 * проверка кончилась); пришёл ответ — закрыты все.
 */
export function stepStates(total, tick, finished) {
  const running = Math.min(tick, total - 1)
  return Array.from({ length: total }, (_, i) => {
    if (finished) return 'done'
    if (i < running) return 'done'
    return i === running ? 'run' : 'wait'
  })
}
