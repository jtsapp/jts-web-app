// Запись поломки сайта из чата помощника.
//
// Вызывает /api/assistant/chat после ответа модели с меткой [[REPORT_BUG]].
// getSql() === null (dev без БД) — тихий отказ: ученик всё равно получил ответ,
// просто строка не сохранится. Падение INSERT тоже не роняет чат.

import { getSql } from './sql.js'
import { SCREEN_NAMES } from '../assistant/prompt.js'

export const LIST_PAGE = 30
export const LIST_PAGE_MAX = 100

function likeNeedle(raw) {
  const s = String(raw ?? '').trim().slice(0, 200)
  if (!s) return null
  return `%${s.replace(/[%_]/g, '')}%`
}

function toDto(row) {
  const screenId = row.screen_id || null
  return {
    id: Number(row.id),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ''),
    profileId: row.profile_id,
    userId: row.user_id == null ? null : Number(row.user_id),
    lang: row.lang || null,
    screenId,
    screenName: screenId ? (SCREEN_NAMES[screenId] || screenId) : null,
    pageUrl: row.page_url || null,
    userAgent: row.user_agent || null,
    userMessage: row.user_message,
    assistantSummary: row.assistant_summary || null,
    screenText: row.screen_text || null,
    clientErrors: Array.isArray(row.client_errors) ? row.client_errors : [],
  }
}

/**
 * Список для вкладки админки. Свежие сверху. Пустой sql — пустой список,
 * без исключения: экран покажет «нет записей», а не 500.
 *
 * @returns {Promise<{ items: object[], total: number }>}
 */
export async function listAssistantErrorReports({ limit = LIST_PAGE, offset = 0, q = '' } = {}, sql = getSql()) {
  if (!sql) return { items: [], total: 0 }
  const take = Math.min(LIST_PAGE_MAX, Math.max(1, Number(limit) || LIST_PAGE))
  const skip = Math.max(0, Number(offset) || 0)
  const like = likeNeedle(q)
  try {
    let total = 0
    let rows
    if (like) {
      const [count] = await sql`
        select count(*)::int as total from assistant_error_reports
        where user_message ilike ${like}
           or coalesce(assistant_summary, '') ilike ${like}
           or coalesce(page_url, '') ilike ${like}
           or coalesce(screen_id, '') ilike ${like}
           or profile_id ilike ${like}
           or coalesce(user_id::text, '') ilike ${like}
      `
      total = count?.total ?? 0
      rows = await sql`
        select id, created_at, profile_id, user_id, lang, screen_id, page_url, user_agent,
               user_message, assistant_summary, screen_text, client_errors
        from assistant_error_reports
        where user_message ilike ${like}
           or coalesce(assistant_summary, '') ilike ${like}
           or coalesce(page_url, '') ilike ${like}
           or coalesce(screen_id, '') ilike ${like}
           or profile_id ilike ${like}
           or coalesce(user_id::text, '') ilike ${like}
        order by created_at desc, id desc
        limit ${take} offset ${skip}
      `
    } else {
      const [count] = await sql`
        select count(*)::int as total from assistant_error_reports
      `
      total = count?.total ?? 0
      rows = await sql`
        select id, created_at, profile_id, user_id, lang, screen_id, page_url, user_agent,
               user_message, assistant_summary, screen_text, client_errors
        from assistant_error_reports
        order by created_at desc, id desc
        limit ${take} offset ${skip}
      `
    }
    return { items: (rows || []).map(toDto), total }
  } catch (err) {
    console.error('[assistant] list error reports failed:', err?.message || err)
    return { items: [], total: 0 }
  }
}

const clip = (s, n) => {
  const str = String(s ?? '')
  return str.length > n ? `${str.slice(0, n)}…` : str
}

/**
 * @param {{
 *   profileId: string,
 *   userId?: number|null,
 *   lang?: string,
 *   screenId?: string|null,
 *   pageUrl?: string,
 *   userAgent?: string,
 *   userMessage: string,
 *   assistantSummary?: string,
 *   screenText?: string,
 *   clientErrors?: unknown,
 * }} row
 * @returns {Promise<boolean>} записалось ли
 */
export async function saveAssistantErrorReport(row, sql = getSql()) {
  if (!sql || !row?.profileId || !row?.userMessage) return false
  try {
    await sql`
      insert into assistant_error_reports (
        profile_id, user_id, lang, screen_id, page_url, user_agent,
        user_message, assistant_summary, screen_text, client_errors
      ) values (
        ${clip(row.profileId, 80)},
        ${row.userId ?? null},
        ${clip(row.lang || '', 8) || null},
        ${clip(row.screenId || '', 64) || null},
        ${clip(row.pageUrl || '', 500) || null},
        ${clip(row.userAgent || '', 400) || null},
        ${clip(row.userMessage, 2000)},
        ${clip(row.assistantSummary || '', 4000) || null},
        ${clip(row.screenText || '', 8000) || null},
        ${sql.json(Array.isArray(row.clientErrors) ? row.clientErrors : [])}::jsonb
      )
    `
    return true
  } catch (err) {
    console.error('[assistant] save error report failed:', err?.message || err)
    return false
  }
}
