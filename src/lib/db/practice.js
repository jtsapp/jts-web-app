// SQL-слой прогресса практики (Neon). Ключ profileId приходит из resolveProfileId
// ('user-<id>'). Мягкая деградация: getSql() === null → чтение отдаёт дефолты,
// запись — no-op (как в остальных db-модулях приложения).

import { getSql } from './sql.js'
import { isValidModule, emptyState, mergeModuleState } from '../practiceContract.js'

export async function loadPracticeState(profileId, sql = getSql()) {
  const out = { vocab: {}, grammar: { done: [] }, listening: { done: [] } }
  if (!sql) return out
  const rows = await sql`
    select module, state from practice_state where profile_id = ${profileId}
  `
  for (const r of rows) if (isValidModule(r.module)) out[r.module] = r.state
  return out
}

export async function savePracticeState(profileId, module, state, sql = getSql()) {
  if (!sql) return
  if (!isValidModule(module)) throw new Error(`unknown practice module: ${module}`)
  // read-merge-write: union для done-модулей не теряет прохождение при синке
  // с разных устройств; для vocab merge просто отдаёт incoming (replace).
  const rows = await sql`
    select state from practice_state
    where profile_id = ${profileId} and module = ${module}
  `
  const existing = rows[0]?.state ?? emptyState(module)
  const merged = mergeModuleState(module, existing, state)
  await sql`
    insert into practice_state (profile_id, module, state)
    values (${profileId}, ${module}, ${JSON.stringify(merged)}::jsonb)
    on conflict (profile_id, module) do update
      set state = ${JSON.stringify(merged)}::jsonb, updated_at = now()
  `
  return merged
}
