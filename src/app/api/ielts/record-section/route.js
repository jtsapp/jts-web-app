// Persist one answer-key-graded IELTS Listening/Reading attempt. The server
// RE-GRADES from the raw answers with the same isomorphic grader the client
// used — the DB row always reflects the canonical grader, never a
// client-computed score. Persistence is best-effort (assess-writing pattern):
// unconfigured DB / unresolved identity / write error → saved:false, never 5xx.
//
// Ported from felix app/api/ielts/record-section/route.ts.

import { ieltsTaskById } from '@/data/ielts-tasks.js'
import { gradeSection } from '@/lib/ielts/key-grading.js'
import { recordIeltsSection } from '@/lib/db/ielts.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

export async function POST(request) {
  let body = {}
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const section = body.section === 'listening' || body.section === 'reading' ? body.section : null
  const taskId = typeof body.taskId === 'string' ? body.taskId : ''
  const task = taskId ? ieltsTaskById(taskId) : null
  if (!section || !task || task.section !== section) {
    return Response.json({ error: 'Unknown section/taskId.' }, { status: 400 })
  }

  const answers = {}
  if (body.answers && typeof body.answers === 'object') {
    for (const [k, v] of Object.entries(body.answers)) {
      if (typeof v === 'string') answers[k.slice(0, 20)] = v.slice(0, 100)
    }
  }

  const result = gradeSection(task.questions, answers)

  let saved = false
  try {
    const resolved = await resolveProfileId(request, body.deviceId)
    if (!('error' in resolved)) {
      const written = await recordIeltsSection({
        profileId: resolved.id,
        section,
        taskId,
        answers,
        result,
      })
      saved = written !== null
    }
  } catch (err) {
    console.error('[ielts.record-section] persist failed', err)
  }

  return Response.json({ result, saved })
}
