// ДНЕВНОЙ лимит разборов устного ответа в «Ситуациях».
//
// Один разбор — три платных звена (см. app/api/practice/situations/assess):
// Azure STT (~$0.008 на ответ в 20–30 с) + Azure Pronunciation (~$0.008) +
// Sonnet на коротком транскрипте (~$0.006) ≈ $0.02. Лимит 20 в сутки → потолок
// ~$0.40 в день на аккаунт. Демо-аккаунту 5 (~$0.10): он живёт 7–14 дней
// (demoExpiresAt на бэкенде) и не заплатит никогда, а пяти разборов хватает,
// чтобы увидеть, ради чего раздел вообще нужен.
//
// Единица списания — РАЗБОР, а не секунды записи, как в shadowingBudget:
// в Shadowing оценивают отрывок целиком (минута стоит как две), здесь ответ на
// задание короткий, а сверху его и так режет MAX_BYTES роута. Кредиты по
// длине дали бы ту же цифру ценой лишней арифметики.
//
// profile_id = 'user-<id>' из resolveProfileId (только залогиненные): гостю
// разбор не положен, по device-id лимит обходится одним рестартом браузера.
// Мягкая деградация getSql() === null → метрирования нет (dev/preview без БД).

import { getSql } from './sql.js'
import { dayKey, nextDayResetAt } from './shadowingBudget.js'

// Реэкспорт, а не копия: «какие это сутки» и «когда сброс» — одна математика на
// все дневные бюджеты. Дубликат со временем разъехался бы с Shadowing, и два
// раздела сбрасывали бы лимит в разные моменты при одинаковом ключе.
export { dayKey, nextDayResetAt }

export const DAILY_LIMIT = 20 // разборов в сутки на аккаунт
export const DEMO_DAILY_LIMIT = 5 // разборов в сутки демо-аккаунту

// Потолок ЭТОГО аккаунта. Показ остатка и списание обязаны спрашивать его одним
// и тем же вызовом: «осталось 0 из 20» на демо-аккаунте с потолком 5 — это
// заявка в поддержку, а не подсказка.
export function dailyLimitFor(isDemoAccount) {
  return isDemoAccount ? DEMO_DAILY_LIMIT : DAILY_LIMIT
}

// Бюджет для ответа клиенту. used == null → метрирования нет (БД не настроена),
// budget = null, и клиент просто не рисует остаток.
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

// Сколько разборов потрачено сегодня (0, если строки нет или нет БД).
export async function getUsed(profileId, dayKeyValue, sql = getSql()) {
  if (!sql) return 0
  const rows = await sql`
    select used from situations_assess
    where profile_id = ${profileId} and day_key = ${dayKeyValue}
  `
  return rows[0]?.used ?? 0
}

// Атомарно списать один разбор — только если не превышаем потолок ЭТОГО
// аккаунта. Возвращает новое used при успехе, либо null при отказе (лимит
// исчерпан) или без БД. Гонки безопасны: инкремент и проверка потолка — одним
// UPDATE под PK-локом.
//
// Путь INSERT (первый разбор за сутки) потолок не проверяет — и не должен:
// единица списания здесь единица, а потолок минимум 5, так что первая строка
// за сутки его переполнить не может (в отличие от бывшего лимита Shadowing, где
// одна длинная запись стоила четыре кредита при демо-потолке в три).
export async function consume(profileId, dayKeyValue, isDemoAccount = false, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    insert into situations_assess (profile_id, day_key, used)
    values (${profileId}, ${dayKeyValue}, 1)
    on conflict (profile_id, day_key) do update
      set used = situations_assess.used + 1, updated_at = now()
      where situations_assess.used + 1 <= ${dailyLimitFor(isDemoAccount)}
    returning used
  `
  return rows[0]?.used ?? null
}

// Вернуть разбор обратно, если списали заранее, а он не состоялся (STT молчит,
// Azure/Claude отвалились). used не уходит ниже нуля.
export async function refund(profileId, dayKeyValue, sql = getSql()) {
  if (!sql) return
  await sql`
    update situations_assess
      set used = greatest(0, used - 1), updated_at = now()
    where profile_id = ${profileId} and day_key = ${dayKeyValue}
  `
}
