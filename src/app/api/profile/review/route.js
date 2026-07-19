// Spaced-repetition review result from the voice tutor. Unlike the journal
// routes (facts/mistakes/topics/resolved) this is not an append — it reschedules
// one existing review_item along the Leitner ladder. Contract used by the agent:
// POST {deviceId?, mistake: string, correct: boolean}. Identity via resolveProfileId
// (Bearer → user-<id>, else deviceId), same as the journal routes.

import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { reviewItem } from '@/lib/db/profile.js'

export const runtime = 'nodejs'

export async function POST(request) {
  if (!isDbConfigured()) {
    return Response.json(
      { configured: false, error: 'DATABASE_URL is not set.' },
      { status: 503 },
    )
  }

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже отдадим updated: 0 */
  }

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  const mistake = typeof body.mistake === 'string' ? body.mistake.trim() : ''
  if (!mistake) return Response.json({ configured: true, ok: true, updated: 0 })
  const correct = body.correct === true

  try {
    await reviewItem(resolved.id, mistake, correct)
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[profile.review] failed', err)
    return Response.json(
      { configured: true, error: 'review update failed.' },
      { status: 500 },
    )
  }
}
