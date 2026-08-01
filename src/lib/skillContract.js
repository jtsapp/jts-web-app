// Валидация тела POST /api/skills. Без побочек — тестируется в node.

import { SKILLS } from '../practice/skillStatsCore.js'

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
