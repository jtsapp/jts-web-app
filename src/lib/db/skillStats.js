// SQL-слой рейтинга навыков. profileId из resolveProfileId ('user-<id>').
// Мягкая деградация: getSql() === null → чтение отдаёт нули, запись — no-op.

import { getSql } from './sql.js'
import { SKILLS, emptyStats } from '../../practice/skillStatsCore.js'

export async function loadSkillStats(profileId, sql = getSql()) {
  const out = emptyStats()
  if (!sql) return out
  const rows = await sql`
    select skill, tasks_done, first_try_correct
    from skill_stat where profile_id = ${profileId}
  `
  for (const r of rows) {
    if (SKILLS.includes(r.skill)) {
      out[r.skill] = { done: Number(r.tasks_done) || 0, firstTry: Number(r.first_try_correct) || 0 }
    }
  }
  return out
}

// Атомарный инкремент: складываем дельты с текущими значениями прямо в БД,
// поэтому синк с разных устройств не теряется (в отличие от записи абсолютов).
// Все навыки в одной транзакции: при сбое посреди батча ничего не применяется,
// значит повторная отправка клиентом не пере-считает уже успевшие навыки.
export async function applySkillDeltas(profileId, deltas, sql = getSql()) {
  if (!sql) return
  const entries = []
  for (const skill of Object.keys(deltas || {})) {
    if (!SKILLS.includes(skill)) continue
    const { done = 0, firstTry = 0 } = deltas[skill] || {}
    if (!done && !firstTry) continue
    entries.push({ skill, done, firstTry })
  }
  if (!entries.length) return
  await sql.begin(async (tx) => {
    for (const { skill, done, firstTry } of entries) {
      await tx`
        insert into skill_stat (profile_id, skill, tasks_done, first_try_correct)
        values (${profileId}, ${skill}, ${done}, ${firstTry})
        on conflict (profile_id, skill) do update
          set tasks_done = skill_stat.tasks_done + ${done},
              first_try_correct = skill_stat.first_try_correct + ${firstTry},
              updated_at = now()
      `
    }
  })
}
