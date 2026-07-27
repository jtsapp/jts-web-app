// Прогресс практики по аккаунту. GET — весь стейт трёх модулей, POST — upsert
// одного. Только для залогиненных: аутентификация первична (401 без Bearer, ещё
// до проверки БД). Идентичность — resolveProfileId (валидный токен → user-<id>).

import { isDbConfigured } from '@/lib/db/sql.js'
import { loadPracticeState, savePracticeState } from '@/lib/db/practice.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { isValidModule, unauthorizedIfNoBearer } from '@/lib/practiceContract.js'

export const runtime = 'nodejs'

function dbUnavailable() {
  return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
}

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return dbUnavailable()

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    const state = await loadPracticeState(resolved.id)
    return Response.json({ configured: true, state })
  } catch (err) {
    console.error('[practice.GET] failed', err)
    return Response.json({ configured: true, error: 'Practice state lookup failed.' }, { status: 500 })
  }
}

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return dbUnavailable()

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело → провалит валидацию ниже */
  }

  if (!isValidModule(body.module)) {
    return Response.json({ configured: true, error: 'Unknown module.' }, { status: 400 })
  }
  if (!body.state || typeof body.state !== 'object') {
    return Response.json({ configured: true, error: 'Invalid state.' }, { status: 400 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    await savePracticeState(resolved.id, body.module, body.state)
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[practice.POST] failed', err)
    return Response.json({ configured: true, error: 'Practice state save failed.' }, { status: 500 })
  }
}
