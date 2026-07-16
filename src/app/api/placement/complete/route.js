// Подтверждённый уровень после устного собеседования. Зовёт голосовой агент
// tool-ом report_placement_level. Клиент финализирует уровень сам из LiveKit,
// так что это подстраховка: пишет уровень в долговременный профиль.
//
// Порт felix app/api/placement/complete/route.ts.

import { isDbConfigured } from '@/lib/db/sql.js'
import { upsertProfile } from '@/lib/db/profile.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export async function POST(request) {
  if (!isDbConfigured()) {
    return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
  }

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже отдадим 400 */
  }

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  const level = typeof body.level === 'string' && VALID_LEVELS.includes(body.level) ? body.level : null
  if (!level) {
    return Response.json({ configured: true, error: 'Invalid or missing level.' }, { status: 400 })
  }

  try {
    await upsertProfile(resolved.id, { level })
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[placement.complete] failed', err)
    return Response.json({ configured: true, error: 'Placement persist failed.' }, { status: 500 })
  }
}
