// Прогон теста на определение уровня, каким его помнит сервер.
//
// Нужен, чтобы проверка ответов не превращалась в оракул: в рамках прогона
// задание проверяется один раз, число заданий ограничено, законченный прогон
// закрыт. Он же — источник правды для итогового уровня: сервер считает его по
// собственной записи ответов, а не по журналу от клиента.
//
// Мягкая деградация, как у остальных db-модулей: без DATABASE_URL (dev,
// preview) getSql() === null, прогон не заводится и проверка работает без
// привязки — тест при этом не ломается.

import { randomUUID } from 'node:crypto'
import { getSql } from './sql.js'
import { decideRun } from '../placementSessionLogic.js'

/** Больше заданий один прогон не проверяет (полный вариант — около сорока). */
export const MAX_GRADED_PER_SESSION = 60

/** Последний прогон профиля (законченный важнее — по нему решается доступ). */
export async function latestPlacementSession(profileId) {
  const sql = getSql()
  if (!sql || !profileId) return null
  const rows = await sql`
    select token, finished, level
    from placement_session
    where profile_id = ${profileId}
    order by finished desc, created_at desc
    limit 1
  `
  if (rows.length === 0) return null
  return { token: rows[0].token, finished: Boolean(rows[0].finished), level: rows[0].level }
}

/**
 * Открывает прогон для профиля. Уровень определяется один раз (при
 * регистрации), поэтому законченный прогон новый не заводит.
 *
 * Незаконченный прогон переиспользуется, но с чистым журналом: клиент каждую
 * попытку начинает с нуля, с новым сидом и в основном с другими заданиями.
 * Пока журнал брошенной попытки оставался, ответы двух попыток копились в
 * одном прогоне — упирались в MAX_GRADED_PER_SESSION (409, и сбросить нечем:
 * тест было не пройти вовсе), а итоговый уровень считался по смеси, и ошибки
 * брошенной попытки топили удачную.
 * @returns {{token: string|null, blocked?: boolean, level?: string|null, restarted?: boolean}}
 */
export async function openPlacementSession({ profileId = null, variant = null } = {}) {
  const sql = getSql()
  if (!sql) return { token: null }

  const decision = decideRun(await latestPlacementSession(profileId))
  if (decision.action === 'blocked') return { token: null, blocked: true, level: decision.level }
  if (decision.action === 'restart') {
    await sql`
      update placement_session
      set answers = ${sql.json([])}::jsonb, variant = ${variant}, updated_at = now()
      where token = ${decision.token} and finished = false
    `
    return { token: decision.token, restarted: true }
  }

  const token = randomUUID()
  await sql`
    insert into placement_session (token, profile_id, variant)
    values (${token}, ${profileId}, ${variant})
  `
  return { token }
}

/** Прогон по токену или null (нет базы / неизвестный токен). */
export async function loadPlacementSession(token) {
  const sql = getSql()
  if (!sql || !token) return null
  const rows = await sql`
    select token, profile_id, variant, answers, finished, level
    from placement_session
    where token = ${token}
  `
  if (rows.length === 0) return null
  const row = rows[0]
  return {
    token: row.token,
    profileId: row.profile_id,
    variant: row.variant,
    answers: Array.isArray(row.answers) ? row.answers : [],
    finished: Boolean(row.finished),
    level: row.level,
  }
}

/** Дописывает проверенные ответы к прогону. */
export async function appendPlacementAnswers(token, answers) {
  const sql = getSql()
  if (!sql || !answers.length) return
  await sql`
    update placement_session
    set answers = ${sql.json(answers)}::jsonb, updated_at = now()
    where token = ${token}
  `
}

/** Закрывает прогон: больше он ответов не принимает. */
export async function finishPlacementSession(token, level) {
  const sql = getSql()
  if (!sql || !token) return
  await sql`
    update placement_session
    set finished = true, level = ${level ?? null}, updated_at = now()
    where token = ${token}
  `
}
