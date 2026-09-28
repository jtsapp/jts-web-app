// Поломки сайта из чата помощника — список для вкладки админки.
//
// Таблица живёт ЗДЕСЬ (assistant_error_reports), у Java-бэкенда её нет.
// Панель ходит сюда тем же токеном, что и за минутами тьютора
// (/api/admin/tutor-usage). Роль спрашиваем у бэкенда: ADMIN и MANAGER.
//
// CORS как у /api/admin/tutor-usage: админка на другом домене.

import { verifyTokenStatus } from '../../../../lib/auth-server.js'
import { isDbConfigured } from '../../../../lib/db/sql.js'
import { listAssistantErrorReports, LIST_PAGE } from '../../../../lib/db/assistantErrorReports.js'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const STAFF = new Set(['ADMIN', 'MANAGER'])

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS })
}

export async function GET(request) {
  if (!isDbConfigured()) {
    return json({ error: 'Database is not configured.' }, 503)
  }
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const { status, user } = await verifyTokenStatus(token)
  if (status === 'unavailable') return json({ error: 'Backend unavailable.' }, 503)
  if (status !== 'ok' || !user) return json({ error: 'Unauthorized.' }, 401)
  if (!STAFF.has(String(user.role || '').toUpperCase())) {
    return json({ error: 'Forbidden.' }, 403)
  }

  const url = new URL(request.url)
  const limit = url.searchParams.get('limit') || LIST_PAGE
  const offset = url.searchParams.get('offset') || 0
  const q = url.searchParams.get('q') || ''
  const { items, total } = await listAssistantErrorReports({ limit, offset, q })
  return json({ items, total })
}
