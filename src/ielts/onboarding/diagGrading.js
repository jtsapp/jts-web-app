import { assessIeltsDiagnostic } from '../../api.js'

// Оценка Writing/Speaking диагностики идёт после сдачи, пока ученик уже смотрит итог. Записи Speaking бэкенд не хранит,
// поэтому экран диагностики оставляет их здесь (в памяти вкладки), а экран итога запускает оценку и ждёт её. Обещания
// живут на уровне модуля: уход с итога и возврат не запускают вторую платную оценку той же секции.
const takes = new Map() // attemptId → [{ itemId, durationSec, wav }]
const running = new Map() // `${attemptId}:${skill}` → Promise

export function keepSpeakingTakes(attemptId, answers) {
  if (answers?.length) takes.set(String(attemptId), answers)
}

export function hasSpeakingTakes(attemptId) {
  return takes.has(String(attemptId))
}

/** Запустить (или вернуть уже идущую) оценку секции. null — оценивать нечем (записи потеряны перезагрузкой). */
export function gradeDiagnostic(token, attemptId, skill, uiLang) {
  const key = `${attemptId}:${skill}`
  if (running.has(key)) return running.get(key)
  let answers
  if (skill === 'speaking') {
    answers = takes.get(String(attemptId))
    if (!answers) return null
  }
  const p = assessIeltsDiagnostic(token, { attemptId, skill, uiLang, answers })
    .then((r) => {
      // оценено — записи больше не нужны (≈2 МБ на минуту речи)
      if (skill === 'speaking') takes.delete(String(attemptId))
      return r
    })
    .finally(() => running.delete(key))
  running.set(key, p)
  return p
}

export function isGrading(attemptId, skill) {
  return running.has(`${attemptId}:${skill}`)
}
