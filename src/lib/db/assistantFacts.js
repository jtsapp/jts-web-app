// SQL-слой памяти Луны (миграция 0022): факты ученика о себе на 30 дней. Что запоминать и что нельзя — правила в
// lib/assistant/facts.js; здесь только запись, чтение и удаление.
//
// profileId — `user-<id>`, как у заметок о советах (assistantTracker.js). Мягкая деградация как во всех db-модулях: без
// DATABASE_URL или без таблицы (миграция не доехала) — пусто и no-op, ответ Луны важнее памяти.

import { getSql } from './sql.js'
import { FACTS_CAP, FACT_TTL_DAYS, factKey, factToSave } from '../assistant/facts.js'

/**
 * Записывает факты (уже из метки модели). Такой же факт — продлевает срок, а не дублирует; сверх FACTS_CAP — старые
 * уходят. Вернёт число записанных.
 */
export async function saveFacts(profileId, raw = [], sql = getSql()) {
  if (!sql || !profileId) return 0
  const facts = [...new Set(raw.map(factToSave).filter(Boolean))]
  if (!facts.length) return 0
  try {
    await sql`delete from assistant_fact where expires_at < now()`
    const have = await sql`select id, fact from assistant_fact where profile_id = ${profileId} order by created_at desc`
    let saved = 0
    for (const fact of facts) {
      const same = have.find((r) => factKey(r.fact) === factKey(fact))
      if (same) {
        await sql`update assistant_fact set fact = ${fact}, expires_at = now() + make_interval(days => ${FACT_TTL_DAYS}) where id = ${same.id}`
      } else {
        await sql`insert into assistant_fact (profile_id, fact, expires_at) values (${profileId}, ${fact}, now() + make_interval(days => ${FACT_TTL_DAYS}))`
      }
      saved++
    }
    await sql`
      delete from assistant_fact where profile_id = ${profileId} and id not in (
        select id from assistant_fact where profile_id = ${profileId} order by created_at desc limit ${FACTS_CAP}
      )
    `
    return saved
  } catch (err) {
    console.warn('[assistant-facts] not saved:', err?.message || err)
    return 0
  }
}

/** Живые факты ученика, свежие сверху: { id, fact, createdAt, expiresAt }. */
export async function loadFacts(profileId, sql = getSql()) {
  if (!sql || !profileId) return []
  try {
    const rows = await sql`
      select id, fact, created_at, expires_at from assistant_fact
      where profile_id = ${profileId} and expires_at > now()
      order by created_at desc
      limit ${FACTS_CAP}
    `
    return rows.map((r) => ({ id: String(r.id), fact: r.fact, createdAt: r.created_at, expiresAt: r.expires_at }))
  } catch {
    return []
  }
}

/** Удалить факт ученика (только свой: profileId из токена). true — был и удалён. */
export async function deleteFact(profileId, id, sql = getSql()) {
  const n = Number(id)
  if (!sql || !profileId || !Number.isInteger(n) || n <= 0) return false
  try {
    const rows = await sql`delete from assistant_fact where id = ${n} and profile_id = ${profileId} returning id`
    return rows.length > 0
  } catch {
    return false
  }
}
