// ДНЕВНОЙ лимит ИИ-разборов «Аркады» (Speak or Die). Та же модель, что у
// «Ситуаций» (situationsBudget.js): profile_id = 'user-<id>' из resolveProfileId
// (только залогиненные — по device-id лимит обходится рестартом браузера),
// списание атомарно и ДО платного вызова, возврат при сбое, мягкая деградация
// getSql() === null → метрирования нет (dev/preview без БД).
//
// Потолки — константы ниже: поменять лимит = поменять число здесь. Infinity —
// без потолка (разборы всё равно считаются). По умолчанию 20 и демо 5, как в
// «Ситуациях»: один разбор — Sonnet на минутной стенограмме, ~$0.01.

import { getSql } from './sql.js'
import { dayKey, nextDayResetAt } from './shadowingBudget.js'

export { dayKey, nextDayResetAt }

export const DAILY_LIMIT = 20 // разборов в сутки на аккаунт; Infinity — без потолка
export const DEMO_DAILY_LIMIT = 5 // разборов в сутки демо-аккаунту

/** Потолок ЭТОГО аккаунта. Показ остатка и списание спрашивают его одним вызовом. */
export function dailyLimitFor(isDemoAccount) {
  return isDemoAccount ? DEMO_DAILY_LIMIT : DAILY_LIMIT
}

// Бюджет для ответа клиенту. used == null → метрирования нет. Без потолка
// limit и remaining — null: клиент не рисует «осталось ∞».
export function budgetPayload(used, isDemoAccount) {
  if (used == null) return null
  const limit = dailyLimitFor(isDemoAccount)
  const unlimited = limit === Infinity
  return {
    limit: unlimited ? null : limit,
    used,
    remaining: unlimited ? null : Math.max(0, limit - used),
    resetsAt: nextDayResetAt(new Date()),
  }
}

// Сколько разборов потрачено за сутки (0, если строки нет или нет БД).
export async function getUsed(profileId, dayKeyValue, sql = getSql()) {
  if (!sql) return 0
  const rows = await sql`
    select used from arcade_review
    where profile_id = ${profileId} and day_key = ${dayKeyValue}
  `
  return rows[0]?.used ?? 0
}

// Атомарно списать один разбор, если не превышаем потолок аккаунта. Новое used
// при успехе, null — отказ (лимит исчерпан) или нет БД. Инкремент и проверка
// потолка — одним UPDATE под PK-локом, поэтому гонка двух запросов потолок не
// пробьёт. Потолок 0 закрывает разборы совсем, и первая строка суток его тоже
// обязана уважать — поэтому 0 проверяется до INSERT.
export async function consume(profileId, dayKeyValue, isDemoAccount = false, sql = getSql()) {
  if (!sql) return null
  const limit = dailyLimitFor(isDemoAccount)
  if (limit === 0) return null
  const rows =
    limit === Infinity
      ? await sql`
          insert into arcade_review (profile_id, day_key, used)
          values (${profileId}, ${dayKeyValue}, 1)
          on conflict (profile_id, day_key) do update
            set used = arcade_review.used + 1, updated_at = now()
          returning used
        `
      : await sql`
          insert into arcade_review (profile_id, day_key, used)
          values (${profileId}, ${dayKeyValue}, 1)
          on conflict (profile_id, day_key) do update
            set used = arcade_review.used + 1, updated_at = now()
            where arcade_review.used + 1 <= ${limit}
          returning used
        `
  return rows[0]?.used ?? null
}

// Вернуть разбор, если списали заранее, а он не состоялся. used не ниже нуля.
export async function refund(profileId, dayKeyValue, sql = getSql()) {
  if (!sql) return
  await sql`
    update arcade_review
      set used = greatest(0, used - 1), updated_at = now()
    where profile_id = ${profileId} and day_key = ${dayKeyValue}
  `
}
