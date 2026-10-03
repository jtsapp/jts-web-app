// Одна поломка из чата помощника: правка текста, примечание, удаление.
//
// PATCH  { summary?: string, note?: string } — summary заменяет «Что передал
//        помощник», note — примечание сотрудника (пустое строкой — убрать).
// DELETE — удалить запись насовсем.
//
// Права и CORS те же, что у списка (../route.js): ADMIN и MANAGER, админка на
// другом домене. Примечание подписываем именем из токена, а не из тела запроса.

import { verifyTokenStatus } from '../../../../../lib/auth-server.js'
import { isDbConfigured } from '../../../../../lib/db/sql.js'
import {
  updateAssistantErrorReport,
  deleteAssistantErrorReport,
} from '../../../../../lib/db/assistantErrorReports.js'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const STAFF = new Set(['ADMIN', 'MANAGER'])

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS })
}

/** @returns {Promise<{ user: object } | { error: Response }>} */
async function authorize(request) {
  if (!isDbConfigured()) return { error: json({ error: 'Database is not configured.' }, 503) }
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const { status, user } = await verifyTokenStatus(token)
  if (status === 'unavailable') return { error: json({ error: 'Backend unavailable.' }, 503) }
  if (status !== 'ok' || !user) return { error: json({ error: 'Unauthorized.' }, 401) }
  if (!STAFF.has(String(user.role || '').toUpperCase())) {
    return { error: json({ error: 'Forbidden.' }, 403) }
  }
  return { user }
}

const FAIL_STATUS = { no_db: 503, invalid: 400, not_found: 404, failed: 500 }

export async function PATCH(request, { params }) {
  const auth = await authorize(request)
  if (auth.error) return auth.error

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }
  const { id } = await params
  const result = await updateAssistantErrorReport(
    id,
    { summary: body?.summary, note: body?.note },
    { name: auth.user.name },
  )
  if (!result.ok) return json({ error: result.reason }, FAIL_STATUS[result.reason] || 500)
  return json({ item: result.item })
}

export async function DELETE(request, { params }) {
  const auth = await authorize(request)
  if (auth.error) return auth.error

  const { id } = await params
  const result = await deleteAssistantErrorReport(id)
  if (result === 'deleted') return json({ ok: true })
  return json({ error: result }, FAIL_STATUS[result] || 500)
}
