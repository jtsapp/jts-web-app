// The learner's IELTS score history (most recent first) for the progress
// screen. A Bearer token resolves the user, else a valid anonymous deviceId;
// reserved user-* ids without a token are rejected. 503 when Neon is
// unconfigured.
//
// Ported from felix app/api/ielts/scores/route.ts.

import { isDbConfigured, listIeltsScores } from '@/lib/db/ielts.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

export async function GET(request) {
  if (!isDbConfigured()) {
    return Response.json(
      { configured: false, error: 'DATABASE_URL is not set.', scores: [] },
      { status: 503 },
    )
  }

  const url = new URL(request.url)
  const resolved = await resolveProfileId(request, url.searchParams.get('deviceId'))
  if ('error' in resolved) return resolved.error

  const limitParam = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50

  try {
    const scores = await listIeltsScores(resolved.id, limit)
    return Response.json({ configured: true, scores })
  } catch (err) {
    console.error('[ielts/scores] list failed', err)
    return Response.json(
      { configured: true, error: 'Score list failed.', scores: [] },
      { status: 500 },
    )
  }
}
