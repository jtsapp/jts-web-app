// Цель уровня до 12.10.2026 жила в базе веба (level_goal). Теперь источник — профиль бэкенда (/mobile/ge), и здесь
// две вещи: разовый перенос старой цели в профиль и зеркало цели профиля обратно в level_goal — карточка ученика у
// преподавателя в web-admin до части 3 читает цель оттуда (/api/admin/student-activity) и держит копию levelTrack.

import { loadLevelGoal, readCachedGoal, saveLevelGoal } from '../lib/levelGoal.js'
import { sanitizeGoal } from '../lib/levelProgress.js'
import { importLegacyGoal } from '../api.js'

const DEPS = { loadLevelGoal, readCachedGoal, saveLevelGoal, importLegacyGoal }

/** Возвращает профиль — тот же или с перенесённой целью. Ошибки сети глотает: это не повод ронять «Главную». */
export async function syncLegacyGoal(token, profile, deps = DEPS) {
  if (!token || !profile) return profile
  if (profile.targetLevel) {
    const goal = sanitizeGoal({ target: profile.targetLevel, from: profile.fromLevel })
    const cached = deps.readCachedGoal(token)
    if (goal && (cached?.target !== goal.target || cached?.from !== goal.from)) await deps.saveLevelGoal(token, goal)
    return profile
  }
  const legacy = (await deps.loadLevelGoal(token)) ?? deps.readCachedGoal(token)
  if (!legacy) return profile
  const target = legacy.target === 'C2' ? 'C1' : legacy.target
  if (target === legacy.from) return profile
  try {
    return (await deps.importLegacyGoal(token, { targetLevel: target, fromLevel: legacy.from })) || profile
  } catch {
    return profile
  }
}
