// SQL-слой результатов теста уровня v16 (миграция 0017). Форму конверта проверяет src/placement/envelope.js — здесь
// только запись и чтение. Без DATABASE_URL — no-op и null, как во всех db-модулях: «Главная» тогда просто без отчёта.

import { getSql } from './sql.js'
import { envelopeSummary } from '../../placement/envelope.js'

export async function saveAttempt(profileId, envelope, sql = getSql()) {
  if (!sql) return null
  const s = envelopeSummary(envelope)
  await sql`
    insert into placement_v16_attempt (profile_id, attempt_id, overall_level, status, envelope)
    values (${profileId}, ${s.attemptId}, ${s.overall}, ${s.status}, ${sql.json(envelope)}::jsonb)
    on conflict (profile_id, attempt_id) do update
      set overall_level = excluded.overall_level,
          status = excluded.status,
          envelope = excluded.envelope,
          updated_at = now()
  `
  return s
}

export async function loadLatestAttempt(profileId, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    select envelope from placement_v16_attempt
    where profile_id = ${profileId}
    order by updated_at desc
    limit 1
  `
  return rows[0]?.envelope ?? null
}
