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
  // с разных устройств; reading сливается «лучшим результатом»; для vocab merge
  // просто отдаёт incoming (replace).
  //
  // Одной транзакцией под замком на (ученик, модуль). Без замка два
  // параллельных POST (две вкладки, «Проверить» подряд) читают одно и то же
  // состояние, и последний затирает слитое первым — для reading ровно та
  // потеря результата, которую слияние должно исключить. Замок транзакционный:
  // снимается сам на commit/rollback.
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${`${profileId}:${module}`}))`
    const rows = await tx`
      select state from practice_state
      where profile_id = ${profileId} and module = ${module}
    `
    const existing = rows[0]?.state ?? emptyState(module)
    const merged = mergeModuleState(module, existing, state)
    // jsonb пишем ТОЛЬКО через .json() (см. тот же приём в profile.js/ielts.js) —
    // JSON.stringify(...)::jsonb даёт двойное кодирование: porsager сериализует
    // параметр сам, а ::jsonb-каст на уже готовую строку кладёт в колонку JSON-СТРОКУ
    // ("{\"done\":[...]}"), а не объект. Дальше .done у неё undefined — вся история
    // прохождения молча обнуляется при каждом мерже вместо накопления.
    await tx`
      insert into practice_state (profile_id, module, state)
      values (${profileId}, ${module}, ${tx.json(merged)}::jsonb)
      on conflict (profile_id, module) do update
        set state = ${tx.json(merged)}::jsonb, updated_at = now()
    `
    return merged
  })
}
