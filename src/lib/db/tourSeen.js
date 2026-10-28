// SQL-слой отметок «тур экрана пройден» (таблица tour_seen, миграция 0019). profileId — из
// resolveProfileId (`user-<id>`), имена туров проверяет роут (isTourName).
//
// Мягкая деградация как во всех db-модулях: без DATABASE_URL чтение отдаёт null, запись — no-op
// (отметка тогда живёт только в браузере, как до этой таблицы).

import { getSql } from './sql.js'

export async function loadToursSeen(profileId, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`select tour from tour_seen where profile_id = ${profileId}`
  return rows.map((r) => r.tour)
}

// Повторная отметка — не ошибка: тот же тур могли пройти на двух устройствах сразу, а дата первого
// прохода важнее последнего.
export async function markToursSeen(profileId, tours, sql = getSql()) {
  if (!sql || !tours.length) return
  await sql`
    insert into tour_seen (profile_id, tour)
    select ${profileId}, t.tour
    from unnest(${tours}::text[]) as t(tour)
    on conflict (profile_id, tour) do nothing
  `
}
