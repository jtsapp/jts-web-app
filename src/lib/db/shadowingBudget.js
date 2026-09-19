// ДНЕВНОЙ лимит платных оценок Shadowing. Оценка вызывает Azure Pronunciation
// Assessment + Claude-совет (см. app/api/shadowing/assess/route.js) — это деньги,
// поэтому на аккаунт даём фиксированный бюджет «кредитов» в сутки.
//
// Был недельным, и это не работало: десять кредитов на неделю — две оценки в
// день и стена к четвергу, при том что в раздел заходят каждый день. Те же
// десять, но в сутки (решение владельца 18.09.2026, миграция 0009).
//
// 1 кредит ≈ до 30 с аудио (худшая цена ~$0.0091: 30/3600·$1 Azure + ~$0.0008
// Claude). Лимит 10 кредитов → потолок ~$0.09 в день на пользователя. Пофразная
// оценка = 1 кредит; «целиком» = ceil(сек/30) кредитов, так что и длинная запись
// не пробивает дневной потолок.
//
// Демо-аккаунту — свой, меньший бюджет. Демо живёт 7–14 дней (demoExpiresAt на
// бэкенде), и три кредита в сутки — это потолок ~$0.03 в день на человека,
// который никогда не заплатит. Демо-квота самого раздела — 12 фраз, так что
// упирается он всё равно в неё, а не в кредиты.
//
// profile_id = 'user-<id>' из resolveProfileId (только залогиненные). Ключ суток —
// дата UTC ('2026-09-18'). Мягкая деградация: getSql()===null → метрирования нет,
// как в остальных db-модулях (dev/preview без БД).

import { getSql } from './sql.js'

export const DAILY_LIMIT = 10 // кредитов в сутки на аккаунт
export const DEMO_DAILY_LIMIT = 3 // кредитов в сутки демо-аккаунту
export const SECONDS_PER_CREDIT = 30 // 1 кредит ≈ до 30 с аудио

// Потолок этого аккаунта. Один и тот же вызов обязан решать и показ остатка, и
// списание: покажи клиенту 10, а спиши по 3 — и «осталось 7» ничего не значит.
export function dailyLimitFor(isDemoAccount) {
  return isDemoAccount ? DEMO_DAILY_LIMIT : DAILY_LIMIT
}

// Бюджет для ответа клиенту: used/remaining по ЕГО потолку, resetsAt — ближайшая
// полночь UTC. used == null → метрирования нет (БД не настроена), budget = null.
export function budgetPayload(used, isDemoAccount) {
  if (used == null) return null
  const limit = dailyLimitFor(isDemoAccount)
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: nextDayResetAt(new Date()),
  }
}

// Запись дороже целого дневного бюджета — оценить нечем, начинать не за что.
// Проверять ОБЯЗАН вызывающий: путь INSERT в consume() лимит не смотрит (см.
// там же), и на демо-потолке в 3 кредита одна запись «целиком» на 2 минуты
// (4 кредита) прошла бы мимо него, если она первая за сутки.
export function exceedsDailyBudget(credits, isDemoAccount) {
  return credits > dailyLimitFor(isDemoAccount)
}

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

// Ключ суток: дата UTC, '2026-09-18'. UTC — по той же причине, что и у недели:
// иначе вечер в Алматы и вечер в Стамбуле попадали бы в разные сутки.
//
// toISOString и так печатает дату в UTC, поэтому раскладывать её через Date.UTC
// (как это делает isoWeekKey — там сдвиг к четвергу и без разбора не обойтись)
// здесь незачем: получилось бы то же самое значение длиннее.
export function dayKey(date) {
  return date.toISOString().slice(0, 10)
}

// Момент сброса дневного лимита: ближайшая полночь UTC.
export function nextDayResetAt(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString()
}

// ── Недельные помощники ─────────────────────────────────────────────────────
// Сам Shadowing на них больше не стоит, но живут они здесь: ими считает бюджет
// ПИСЬМА (writingBudget.js его реэкспортирует) и недельная сводка Roadmap
// (ecosystem.js). Переносить ради чистоты — трогать два чужих модуля без нужды.

// Момент сброса недельного лимита: ближайший понедельник 00:00 UTC.
export function nextWeekResetAt(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7 // 1..7 (пн..вс)
  d.setUTCDate(d.getUTCDate() + (8 - day)) // следующий понедельник
  return d.toISOString()
}

// Сколько кредитов уже потрачено сегодня (0, если строки нет или нет БД).
export async function getUsed(profileId, dayKeyValue, sql = getSql()) {
  if (!sql) return 0
  const rows = await sql`
    select used from shadowing_assess
    where profile_id = ${profileId} and day_key = ${dayKeyValue}
  `
  return rows[0]?.used ?? 0
}

// Атомарно списать credits — только если не превышаем потолок ЭТОГО аккаунта
// (dailyLimitFor). Возвращает новое used при успехе, либо null при отказе
// (лимит исчерпан) или без БД. Гонки безопасны: инкремент и проверка лимита —
// одним UPDATE под PK-локом. ВАЖНО: путь INSERT (первая запись за сутки) не
// проверяет лимит, поэтому вызывающий обязан сам отсечь слишком дорогую запись
// — см. exceedsDailyBudget.
export async function consume(profileId, dayKeyValue, credits, isDemoAccount = false, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    insert into shadowing_assess (profile_id, day_key, used)
    values (${profileId}, ${dayKeyValue}, ${credits})
    on conflict (profile_id, day_key) do update
      set used = shadowing_assess.used + ${credits}, updated_at = now()
      where shadowing_assess.used + ${credits} <= ${dailyLimitFor(isDemoAccount)}
    returning used
  `
  return rows[0]?.used ?? null
}

// Вернуть credits обратно, если списали заранее, а оценка не состоялась
// (Azure отдал mock / сбой). used не уходит ниже нуля.
export async function refund(profileId, dayKeyValue, credits, sql = getSql()) {
  if (!sql) return
  await sql`
    update shadowing_assess
      set used = greatest(0, used - ${credits}), updated_at = now()
    where profile_id = ${profileId} and day_key = ${dayKeyValue}
  `
}
