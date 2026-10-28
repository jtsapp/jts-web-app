// Пройденные туры экранов: GET → { tours: ['home:ge', …] }, POST { tours: [...] } → { ok }.
//
// Только для залогиненных: отметка на аккаунт и нужна, чтобы тур не выходил снова в другом браузере
// или после смены ключа (см. миграцию 0019). У гостя отметка остаётся в его браузере. Личность —
// resolveProfileId по токену, не из тела. Без базы GET отдаёт configured: false — клиент тогда
// живёт отметками браузера, а не считает, что туров никто не проходил.

import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { loadToursSeen, markToursSeen } from '@/lib/db/tourSeen.js'
import { isTourName } from '@/lib/tourName.js'

export const runtime = 'nodejs'

// Туров у приложения меньше десятка; потолок — чтобы тело запроса не стало способом писать в базу мусор.
const MAX_TOURS = 20

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return Response.json({ configured: false, tours: [] })

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    return Response.json({ configured: true, tours: (await loadToursSeen(resolved.id)) || [] })
  } catch (err) {
    console.error('[profile.tours] read failed', err)
    return Response.json({ configured: true, error: 'tours read failed.' }, { status: 500 })
  }
}

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) {
    return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже отдадим 400 */
  }

  const tours = Array.isArray(body.tours) ? [...new Set(body.tours)] : []
  if (!tours.length || tours.length > MAX_TOURS || !tours.every(isTourName)) {
    return Response.json({ configured: true, error: 'Invalid tours.' }, { status: 400 })
  }

  try {
    await markToursSeen(resolved.id, tours)
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[profile.tours] write failed', err)
    return Response.json({ configured: true, error: 'tours write failed.' }, { status: 500 })
  }
}
