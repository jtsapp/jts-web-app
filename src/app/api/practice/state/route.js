// Прогресс практики по аккаунту. GET — весь стейт трёх модулей, POST — upsert
// одного. Только для залогиненных: аутентификация первична (401 без Bearer, ещё
// до проверки БД). Идентичность — resolveProfileId (валидный токен → user-<id>).

import { isDbConfigured } from '@/lib/db/sql.js'
import { loadPracticeState, savePracticeState } from '@/lib/db/practice.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { emptyState, isValidModule, isValidStateShape, unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { sanitizeReadingState } from '@/lib/readingState.js'

export const runtime = 'nodejs'

function dbUnavailable() {
  return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
}

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return dbUnavailable()

  // ?module=<имя> — один модуль: «Чтение» берёт свой прогресс с сервера при
  // каждом открытии раздела и на экране итога, тянуть ради этого весь стейт
  // практики незачем.
  const only = new URL(request.url).searchParams.get('module')
  if (only !== null && !isValidModule(only)) {
    return Response.json({ configured: true, error: 'Unknown module.' }, { status: 400 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    const all = await loadPracticeState(resolved.id)
    const state = only ? { [only]: all[only] ?? emptyState(only) } : all
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
  if (!isValidStateShape(body.state)) {
    return Response.json({ configured: true, error: 'Invalid state.' }, { status: 400 })
  }
  // «Чтение» сливается на сервере (readingState.js), поэтому вход чистим строго:
  // мусор в jsonb пережил бы любой клиент.
  let incoming = body.state
  if (body.module === 'reading') {
    incoming = sanitizeReadingState(body.state)
    if (!incoming) return Response.json({ configured: true, error: 'Invalid state.' }, { status: 400 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    // Слитое состояние уходит обратно: клиент «Чтения» показывает именно его —
    // это и есть «результат с сервера».
    const merged = await savePracticeState(resolved.id, body.module, incoming)
    return Response.json({ configured: true, ok: true, state: merged ?? null })
  } catch (err) {
    console.error('[practice.POST] failed', err)
    return Response.json({ configured: true, error: 'Practice state save failed.' }, { status: 500 })
  }
}
