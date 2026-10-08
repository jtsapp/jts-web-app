// SQL-слой цели уровня («Цель — B2» на «Главной»). profileId — из
// resolveProfileId (`user-<id>`). Проверку значений не дублируем: та же
// sanitizeGoal, по которой клиент рисует дорожку, — записать можно только то,
// что экран сумеет показать.
//
// Мягкая деградация как во всех db-модулях: без DATABASE_URL чтение отдаёт
// null, запись — no-op (цель тогда живёт в кэше браузера, см. lib/levelGoal.js).

import { getSql } from './sql.js'
import { sanitizeGoal } from '../levelProgress.js'

export async function loadLevelGoal(profileId, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    select target_level, from_level from level_goal where profile_id = ${profileId}
  `
  const r = rows[0]
  return r ? sanitizeGoal({ target: r.target_level, from: r.from_level }) : null
}

/**
 * Записывает цель или снимает её (goal = null). Возвращает то, что легло.
 * Негодная цель не пишется вовсе — вызывающий отличает это от снятия по null
 * на входе.
 */
export async function saveLevelGoal(profileId, goal, sql = getSql()) {
  if (!sql) return null
  if (goal === null) {
    await sql`delete from level_goal where profile_id = ${profileId}`
    return null
  }
  const g = sanitizeGoal(goal)
  if (!g) return null
  await sql`
    insert into level_goal (profile_id, target_level, from_level)
    values (${profileId}, ${g.target}, ${g.from})
    on conflict (profile_id) do update
      set target_level = excluded.target_level,
          from_level = excluded.from_level,
          updated_at = now()
  `
  return g
}
