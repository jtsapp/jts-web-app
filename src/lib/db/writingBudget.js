// Лимиты платных AI-вызовов раздела Writing. Два независимых счётчика:
//
// - Проверка работы (Sonnet, дефолтная модель structured()): ~$0.03/проверка —
//   эссе ~400 слов на входе плюс полный rewrite на выходе. Недельный лимит 10 →
//   потолок ~$0.30/нед на активный аккаунт (до ~$0.60 на длинных C1-эссе).
// - Перевод выделенного фрагмента (Haiku): ~$0.001/вызов. Дневной лимит 100 →
//   потолок ~$0.10/день; честному ученику хватает с запасом, скрипт в цикле
//   упирается в 429.
//
// Модель — shadowingBudget.js: profile_id = 'user-<id>' из resolveProfileId
// (только залогиненные), мягкая деградация getSql()===null → метрирования нет
// (dev/preview без БД), списание атомарно и ДО платного вызова.

import { getSql } from './sql.js'
import { isoWeekKey, nextWeekResetAt } from './shadowingBudget.js'

// Реэкспорт, а не копия: недельная математика (ISO-неделя, момент сброса) одна
// на все бюджеты. Дубликат со временем разъехался бы с shadowing — и лимиты
// сбрасывались бы в разные моменты при одинаковом ключе в БД.
export { isoWeekKey, nextWeekResetAt }

export const WEEKLY_CHECK_LIMIT = 10 // AI-проверок в неделю на аккаунт
export const DAILY_TRANSLATE_LIMIT = 100 // переводов в день на аккаунт

// Ключ дня в UTC ('2026-08-27'). UTC — чтобы ключ не зависел от таймзоны
// сервера (тот же довод, что у isoWeekKey в shadowingBudget.js).
export function dayKey(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Момент сброса дневного лимита: ближайшая полночь UTC. Date.UTC с «днём + 1»
// сам переносит месяц/год, поэтому 31 декабря отдаёт 1 января следующего года.
export function nextDayResetAt(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1))
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Проверки (недельный бюджет)
// ---------------------------------------------------------------------------

// Текущий недельный бюджет проверок для ответа клиенту. null — метрирования
// нет (БД не настроена): клиент тогда прячет счётчик, а не рисует нули.
export async function checkBudget(profileId, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    select used from writing_assess
    where profile_id = ${profileId} and week_key = ${isoWeekKey(new Date())}
  `
  const used = rows[0]?.used ?? 0
  return {
    limit: WEEKLY_CHECK_LIMIT,
    used,
    remaining: Math.max(0, WEEKLY_CHECK_LIMIT - used),
    resetsAt: nextWeekResetAt(new Date()),
  }
}

// Атомарно списать одну проверку — только если не превышаем WEEKLY_CHECK_LIMIT.
// Возвращает новое used при успехе, либо null при отказе (лимит исчерпан) или
// без БД. Гонки безопасны: инкремент и проверка лимита — одним UPDATE под
// PK-локом. ВАЖНО: путь INSERT (первая запись недели) лимит не проверяет — как
// и в shadowing — но здесь это безопасно само по себе: списывается всегда ровно
// 1, а 1 <= WEEKLY_CHECK_LIMIT.
export async function consumeCheck(profileId, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    insert into writing_assess (profile_id, week_key, used)
    values (${profileId}, ${isoWeekKey(new Date())}, 1)
    on conflict (profile_id, week_key) do update
      set used = writing_assess.used + 1, updated_at = now()
      where writing_assess.used + 1 <= ${WEEKLY_CHECK_LIMIT}
    returning used
  `
  return rows[0]?.used ?? null
}

// Вернуть проверку обратно, если списали заранее, а оценка не состоялась
// (сбой модели / невалидный ответ). used не уходит ниже нуля.
export async function refundCheck(profileId, sql = getSql()) {
  if (!sql) return
  await sql`
    update writing_assess
      set used = greatest(0, used - 1), updated_at = now()
    where profile_id = ${profileId} and week_key = ${isoWeekKey(new Date())}
  `
}

// ---------------------------------------------------------------------------
// Переводы (дневной бюджет) — та же троица, но ключ дневной.
// ---------------------------------------------------------------------------

export async function translateBudget(profileId, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    select used from writing_translate
    where profile_id = ${profileId} and day_key = ${dayKey(new Date())}
  `
  const used = rows[0]?.used ?? 0
  return {
    limit: DAILY_TRANSLATE_LIMIT,
    used,
    remaining: Math.max(0, DAILY_TRANSLATE_LIMIT - used),
    resetsAt: nextDayResetAt(new Date()),
  }
}

// Атомарное списание одного перевода; контракт тот же, что у consumeCheck
// (включая безопасность INSERT-пути: 1 <= DAILY_TRANSLATE_LIMIT).
export async function consumeTranslate(profileId, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    insert into writing_translate (profile_id, day_key, used)
    values (${profileId}, ${dayKey(new Date())}, 1)
    on conflict (profile_id, day_key) do update
      set used = writing_translate.used + 1, updated_at = now()
      where writing_translate.used + 1 <= ${DAILY_TRANSLATE_LIMIT}
    returning used
  `
  return rows[0]?.used ?? null
}

export async function refundTranslate(profileId, sql = getSql()) {
  if (!sql) return
  await sql`
    update writing_translate
      set used = greatest(0, used - 1), updated_at = now()
    where profile_id = ${profileId} and day_key = ${dayKey(new Date())}
  `
}
