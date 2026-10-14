// Цель уровня до 12.10.2026 жила в базе веба (level_goal). Теперь источник — профиль бэкенда (/mobile/ge), и здесь
// только разовый перенос старой цели в профиль. Зеркало цели обратно в level_goal снято в части 3 (13.10.2026):
// карточка преподавателя в web-admin читает цель из профиля бэкенда (/admin/teacher-ge/students/{id}/profile), а
// level_goal остаётся ей запасным источником — для тех, кто анкету не проходил.

import { loadLevelGoal, readCachedGoal } from '../lib/levelGoal.js'
import { importLegacyGoal } from '../api.js'

const DEPS = { loadLevelGoal, readCachedGoal, importLegacyGoal }

/** Возвращает профиль — тот же или с перенесённой целью. Ошибки сети глотает: это не повод ронять «Главную». */
export async function syncLegacyGoal(token, profile, deps = DEPS) {
  if (!token || !profile || profile.targetLevel) return profile
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
