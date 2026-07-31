// Недельный лимит платных оценок Shadowing. Оценка вызывает Azure Pronunciation
// Assessment + Claude-совет (см. app/api/shadowing/assess/route.js) — это деньги,
// поэтому на аккаунт даём фиксированный бюджет «кредитов» в неделю.
//
// 1 кредит ≈ до 30 с аудио (худшая цена ~$0.0091: 30/3600·$1 Azure + ~$0.0008
// Claude). Лимит 10 кредитов → потолок ~$0.09/нед на пользователя. Пофразная
// оценка = 1 кредит; «целиком» = ceil(сек/30) кредитов, так что и длинная запись
// не пробивает недельный потолок.
//
// profile_id = 'user-<id>' из resolveProfileId (только залогиненные). Ключ недели —
// ISO ('2026-W31'). Мягкая деградация: getSql()===null → метрирования нет, как в
// остальных db-модулях (dev/preview без БД).

import { getSql } from './sql.js'

export const WEEKLY_LIMIT = 10 // кредитов в неделю на аккаунт
export const SECONDS_PER_CREDIT = 30 // 1 кредит ≈ до 30 с аудио

// Длительность 16кГц mono 16-bit PCM WAV по размеру буфера: data ≈ всё минус
// 44-байтный заголовок. Считаем по реальным байтам файла, а не по клиентскому
// полю — его нельзя подделать в свою пользу.
export function wavSeconds(byteLength) {
  const data = Math.max(0, Number(byteLength) - 44)
  return data / (16000 * 2)
}

// Сколько кредитов стоит запись длиной seconds (минимум 1).
export function creditsForSeconds(seconds) {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s <= 0) return 1
  return Math.max(1, Math.ceil(s / SECONDS_PER_CREDIT))
}

// ISO-неделя в UTC → 'YYYY-Www'. Год недели определяет её четверг (ISO 8601),
// поэтому конец декабря/начало января попадают в правильную неделю. UTC — чтобы
// ключ не зависел от таймзоны сервера.
export function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7 // 1..7 (пн..вс)
  d.setUTCDate(d.getUTCDate() + 4 - day) // сдвиг к четвергу недели
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// Момент сброса лимита: ближайший понедельник 00:00 UTC (начало следующей недели).
export function nextWeekResetAt(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7 // 1..7 (пн..вс)
  d.setUTCDate(d.getUTCDate() + (8 - day)) // следующий понедельник
  return d.toISOString()
}

// Сколько кредитов уже потрачено на этой неделе (0, если строки нет или нет БД).
export async function getUsed(profileId, weekKey, sql = getSql()) {
  if (!sql) return 0
  const rows = await sql`
    select used from shadowing_assess
    where profile_id = ${profileId} and week_key = ${weekKey}
  `
  return rows[0]?.used ?? 0
}

// Атомарно списать credits — только если не превышаем WEEKLY_LIMIT. Возвращает
// новое used при успехе, либо null при отказе (лимит исчерпан) или без БД.
// Гонки безопасны: инкремент и проверка лимита — одним UPDATE под PK-локом.
// ВАЖНО: путь INSERT (первая запись недели) не проверяет лимит, поэтому
// вызывающий обязан сам отсечь credits > WEEKLY_LIMIT до вызова.
export async function consume(profileId, weekKey, credits, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    insert into shadowing_assess (profile_id, week_key, used)
    values (${profileId}, ${weekKey}, ${credits})
    on conflict (profile_id, week_key) do update
      set used = shadowing_assess.used + ${credits}, updated_at = now()
      where shadowing_assess.used + ${credits} <= ${WEEKLY_LIMIT}
    returning used
  `
  return rows[0]?.used ?? null
}

// Вернуть credits обратно, если списали заранее, а оценка не состоялась
// (Azure отдал mock / сбой). used не уходит ниже нуля.
export async function refund(profileId, weekKey, credits, sql = getSql()) {
  if (!sql) return
  await sql`
    update shadowing_assess
      set used = greatest(0, used - ${credits}), updated_at = now()
    where profile_id = ${profileId} and week_key = ${weekKey}
  `
}
