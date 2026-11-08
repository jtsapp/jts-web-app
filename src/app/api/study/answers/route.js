// src/app/api/study/answers/route.js
// Ответы заданий для модели ученика Луны (ТЗ v2.0, 8.1 и 8.3; спека
// docs/superpowers/specs/2026-11-08-luna-student-model-methodology-design.md). POST — пачка ответов от
// practice/studyLog.js: журнал (30 дней) и шаг интервального повторения у тем и слов. Только для вошедших: гостю Луна
// недоступна, а модель по device-id обходилась бы рестартом браузера.

import { isDbConfigured } from '@/lib/db/sql.js'
import { recordAnswers } from '@/lib/db/studentModel.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { cleanAnswers } from '@/lib/studentModel/contract.js'

export const runtime = 'nodejs'

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return Response.json({ configured: false }, { status: 503 })

  let body = null
  try {
    body = await request.json()
  } catch {
    /* пустое тело → 400 ниже */
  }
  const answers = cleanAnswers(body)
  if (!answers) return Response.json({ error: 'Invalid answers.' }, { status: 400 })

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  if (!/^user-\d+$/.test(String(resolved.id))) return Response.json({ error: 'Authentication required.' }, { status: 401 })

  try {
    const res = await recordAnswers(resolved.id, answers)
    return Response.json({ ok: true, ...res })
  } catch (err) {
    console.error('[study.answers] failed', err?.message || err)
    return Response.json({ error: 'Save failed.' }, { status: 500 })
  }
}
