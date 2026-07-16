// Результат одной попытки урока (План уроков).
// Порт felix app/api/profile/lessons/route.ts.

import { isDbConfigured } from '@/lib/db/sql.js'
import { upsertLessonProgress } from '@/lib/db/lessons.js'
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
    /* пустое тело — ниже отдадим 400 */
  }

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  const lessonKey = typeof body.lessonKey === 'string' ? body.lessonKey.trim().slice(0, 80) : ''
  const status = body.status === 'passed' || body.status === 'failed' ? body.status : null
  if (!lessonKey || !status) {
    return Response.json(
      { configured: true, error: 'lessonKey and status are required.' },
      { status: 400 },
    )
  }
  const score =
    typeof body.score === 'number' && Number.isFinite(body.score)
      ? Math.max(0, Math.min(100, Math.round(body.score)))
      : 0
  const nextVariant =
    typeof body.nextVariant === 'number' && Number.isFinite(body.nextVariant)
      ? Math.max(0, Math.min(3, Math.round(body.nextVariant)))
      : 0

  try {
    await upsertLessonProgress(resolved.id, { lessonKey, status, score, nextVariant })
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[profile.lessons] failed', err)
    return Response.json(
      { configured: true, error: 'Lesson progress upsert failed.' },
      { status: 500 },
    )
  }
}
