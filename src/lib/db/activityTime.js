// Запись активного времени в тренажёрах, которые сами его не пишут: воркбук
// (workbooks) и практика «Словаря» (vocabulary_sr). Считает клиент — хук
// src/lib/useTimeOnTask.js, сюда приходят пачки секунд.
//
// Тьютор и шэдоуинг от клиента НЕ принимаем: их время уже лежит в voice_usage
// и shadowing_assess, и приём тех же модулей дал бы двойной счёт, а заодно
// позволил бы «накрутить» норматив по речи без единого звонка.
//
// Клиенту здесь верим только в «сколько секунд я насчитал», и то с потолками:
// на запрос (хук шлёт раз в минуту, законная пачка — минута с хвостиком) и на
// сутки (вкладка, забытая открытой, не должна закрыть недельный норматив).
// День ставит сервер — в UTC, как границы недели в сводке.
//
// Мягкая деградация как во всех db-модулях: без DATABASE_URL ничего не пишем.

import { getSql } from './sql.js'

export const CLIENT_TRACKED_MODULES = ['workbooks', 'vocabulary_sr']

export const MAX_BATCH_SEC = 300 // потолок одной пачки
export const DAY_CAP_SEC = 6 * 3600 // потолок на модуль в сутки

export function isClientTrackedModule(module) {
  return CLIENT_TRACKED_MODULES.includes(module)
}

// Секунды из тела запроса → целое в (0, MAX_BATCH_SEC]; мусор и отрицательные — 0.
export function clampBatchSeconds(value) {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(MAX_BATCH_SEC, n)
}

export function utcDay(date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Прибавляет секунды к сегодняшней строке профиля. Инкремент и суточный
 * потолок — одним UPSERT'ом под PK-локом, так что параллельные пачки из двух
 * вкладок не теряют друг друга и не пробивают потолок.
 *
 * @returns {Promise<number|null>} сколько набралось за сутки; null — нечего писать или нет БД
 */
export async function addActivitySeconds(profileId, module, seconds, now = new Date(), sql = getSql()) {
  if (!sql) return null
  const add = clampBatchSeconds(seconds)
  if (!add) return null
  const rows = await sql`
    insert into activity_time (profile_id, module, day, seconds)
    values (${profileId}, ${module}, ${utcDay(now)}, ${add})
    on conflict (profile_id, module, day) do update
      set seconds = least(activity_time.seconds + excluded.seconds, ${DAY_CAP_SEC}::int),
          updated_at = now()
    returning seconds
  `
  return rows[0]?.seconds ?? null
}
