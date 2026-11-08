// Валидация тела POST /api/skills. Без побочек — тестируется в node.

import { SKILLS, skillLevel } from '../practice/skillStatsCore.js'

export function isValidSkill(s) {
  return typeof s === 'string' && SKILLS.includes(s)
}

function isCount(n) {
  return Number.isInteger(n) && n >= 0
}

// body = { deltas: { <skill>: { done, firstTry } } }
// Возвращает нормализованные дельты (только валидные навыки) или null.
export function validateDeltas(body) {
  if (!body || typeof body !== 'object') return null
  const deltas = body.deltas
  if (!deltas || typeof deltas !== 'object') return null
  const keys = Object.keys(deltas)
  if (keys.length === 0) return null
  const out = {}
  for (const skill of keys) {
    if (!isValidSkill(skill)) return null
    const d = deltas[skill]
    if (!d || typeof d !== 'object') return null
    const done = d.done
    const firstTry = d.firstTry
    if (!isCount(done) || !isCount(firstTry)) return null
    if (firstTry > done) return null
    out[skill] = { done, firstTry }
  }
  return out
}

// body.byLevel = { A2: { <skill>: { done, firstTry } } } — те же попытки, разложенные по уровню задания
// (ТЗ v2.0, 5.5). Необязательное: старый клиент его не шлёт. Кривой уровень или дельта — весь byLevel
// отбрасывается (null), а общий итог по deltas всё равно пишется: навык ученика не должен теряться
// из-за разбивки по уровням.
export function validateByLevel(body) {
  const raw = body?.byLevel
  if (raw == null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const out = {}
  for (const key of Object.keys(raw)) {
    const level = skillLevel(key)
    if (!level || level !== key) return null
    const deltas = validateDeltas({ deltas: raw[key] })
    if (!deltas) return null
    out[level] = deltas
  }
  return out
}
