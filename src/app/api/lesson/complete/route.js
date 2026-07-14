// Scenario / lesson completion sink.
//
// The voice agent's report_task_complete tool fires a best-effort POST here the
// moment a structured scenario reaches its verdict (the live UI is driven by a
// LiveKit data message on topic "lesson"; this route is the durable path).
//
// Persistence is intentionally a no-op for now — the profiles/progress tables
// don't exist on this branch yet. Once they land, write the pass/fail + score
// here keyed by owner_id so progress follows the account across devices.
// Until then we validate, log, and return ok so the agent's fire-and-forget
// call never errors.

export const runtime = 'nodejs'

function ok() {
  return Response.json({ ok: true })
}

async function handle(body) {
  const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : ''
  const scenarioId = typeof body?.scenarioId === 'string' ? body.scenarioId : ''
  const passed = Boolean(body?.passed)
  if (!scenarioId) return ok()
  // TODO(profiles): persist { owner_id, scenarioId, passed, score } to Neon.
  console.log('[lesson.complete]', { deviceId, scenarioId, passed })
  return ok()
}

export async function POST(request) {
  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    // empty / malformed body — treat as no-op
  }
  return handle(body)
}
