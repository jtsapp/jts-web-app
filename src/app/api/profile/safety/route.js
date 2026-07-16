// Липкий флаг безопасности. Ставится, когда тьютор распознал реально опасную
// ситуацию (самоповреждение, насилие). Обратно не снимается.
// Порт felix app/api/profile/safety/route.ts.

import { isDbConfigured } from '@/lib/db/sql.js'
import { raiseSafetyAlert } from '@/lib/db/profile.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

export async function POST(request) {
  if (!isDbConfigured()) {
    return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
  }

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело допустимо */
  }

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  try {
    await raiseSafetyAlert(resolved.id)
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[profile.safety] failed', err)
    return Response.json({ configured: true, error: 'Safety flag failed.' }, { status: 500 })
  }
}
