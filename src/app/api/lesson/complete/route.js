// Scenario / lesson completion sink.
//
// The voice agent's report_task_complete tool fires a best-effort POST here the
// moment a structured scenario reaches its verdict (the live UI is driven by a
// LiveKit data message on topic "lesson"; this route is the durable path).
//
// Identity comes from resolveProfileId, so a logged-in learner's scenario
// results follow the account across devices; anonymous ones stay on the
// deviceId. The agent has no learner token, so it authenticates with the
// service key (see lib/auth-server).

import { isDbConfigured } from '@/lib/db/sql.js'
import { upsertLessonProgress } from '@/lib/db/lessons.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

// The agent's call is fire-and-forget: it never reads the body and a rejection
// would just noise its logs. Report failures via status, keep the shape stable.
function ok(extra = {}) {
  return Response.json({ ok: true, ...extra })
}

export async function POST(request) {
  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    // empty / malformed body — treat as no-op
  }

  const scenarioId = typeof body.scenarioId === 'string' ? body.scenarioId.trim().slice(0, 80) : ''
  if (!scenarioId) return ok({ written: 0 })

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  if (!isDbConfigured()) return ok({ written: 0 })

  const passed = Boolean(body.passed)
  const score =
    typeof body.score === 'number' && Number.isFinite(body.score)
      ? Math.max(0, Math.min(100, Math.round(body.score)))
      : 0

  try {
    await upsertLessonProgress(resolved.id, {
      lessonKey: scenarioId,
      status: passed ? 'passed' : 'failed',
      score,
      // Сценарии не имеют вариантов, как уроки плана: держим 0.
      nextVariant: 0,
    })
    return ok()
  } catch (err) {
    console.error('[lesson.complete] failed', err)
    return Response.json({ ok: false, error: 'Lesson progress upsert failed.' }, { status: 500 })
  }
}
