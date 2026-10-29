import { assessIeltsDiagnostic } from '../../api.js'
import { deletePendingTakes, diagKey, loadPendingTakes, savePendingTakes } from '../speaking/pendingTakes.js'

// Оценка Writing/Speaking диагностики идёт после сдачи, пока ученик уже смотрит итог. Записи Speaking бэкенд не хранит,
// поэтому экран диагностики оставляет их здесь — в памяти вкладки и копией на устройстве (pendingTakes.js): раньше
// перезагрузка или сбой модели до оценки теряли их, и секция навсегда оставалась «ждёт ИИ». Обещания живут на уровне
// модуля: уход с итога и возврат не запускают вторую платную оценку той же секции.
const takes = new Map() // attemptId → [{ itemId, durationSec, wav }]
const running = new Map() // `${attemptId}:${skill}` → Promise

export function keepSpeakingTakes(attemptId, answers) {
  if (!answers?.length) return
  takes.set(String(attemptId), answers)
  savePendingTakes(diagKey(attemptId), { answers }).catch(() => {})
}

export function hasSpeakingTakes(attemptId) {
  return takes.has(String(attemptId))
}

async function speakingTakes(attemptId) {
  const mem = takes.get(String(attemptId))
  if (mem) return mem
  const rec = await loadPendingTakes(diagKey(attemptId)).catch(() => null)
  if (rec?.answers?.length) takes.set(String(attemptId), rec.answers)
  return rec?.answers || null
}

function forget(attemptId) {
  takes.delete(String(attemptId))
  deletePendingTakes(diagKey(attemptId)).catch(() => {})
}

/**
 * Запустить (или вернуть уже идущую) оценку секции. Записей Speaking нет ни в памяти, ни на устройстве — обещание
 * отклоняется с кодом `lost`: оценивать нечем, экран так и говорит.
 */
export function gradeDiagnostic(token, attemptId, skill, uiLang) {
  const key = `${attemptId}:${skill}`
  if (running.has(key)) return running.get(key)
  const p = (skill === 'speaking' ? speakingTakes(attemptId) : Promise.resolve(undefined))
    .then((answers) => {
      if (skill === 'speaking' && !answers) throw Object.assign(new Error('lost'), { code: 'lost' })
      return assessIeltsDiagnostic(token, { attemptId, skill, uiLang, answers })
    })
    .then(
      (r) => {
        // оценено — записи больше не нужны (≈2 МБ на минуту речи)
        if (skill === 'speaking') forget(attemptId)
        return r
      },
      (e) => {
        // секцию уже оценил другой запрос (вторая вкладка) — записи тоже больше не нужны
        if (skill === 'speaking' && e?.code === 'already') forget(attemptId)
        throw e
      },
    )
    .finally(() => running.delete(key))
  running.set(key, p)
  return p
}

export function isGrading(attemptId, skill) {
  return running.has(`${attemptId}:${skill}`)
}
