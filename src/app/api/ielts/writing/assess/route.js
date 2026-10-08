// Оценка работы Writing из банка бэкенда: POST { attemptId, uiLang } с токеном ученика.
//
// 1. квота IELTS (Writing — платная секция) — ДО платного вызова;
// 2. claim на бэкенде (токен ученика + служебный ключ): работа своя и ждёт оценки, текст и задание — оттуда;
// 3. Sonnet → критерии; 4. результат на бэкенд, общий band считает он. Модель не ответила — fail, работа снова ждёт.
//
// Ключ IELTS_GRADER_KEY знает только сервер: без него бэкенд не отдаст работу на оценку и не примет band.

import { hasAnthropicKey, IELTS_REVIEW_MODEL, structured } from '@/lib/anthropic.js'
import { BACKEND_URL, bearerFromRequest } from '@/lib/auth-server.js'
import { checkIeltsQuota } from '@/lib/ielts/quota.js'
import { isDbConfigured, recordIeltsWriting } from '@/lib/db/ielts.js'
import { WRITING_SCHEMA, buildSystemPrompt, normalizeAssessment, userMessage } from '@/lib/ielts/writingGrader.js'

export const runtime = 'nodejs'
// оценка эссе Sonnet'ом — 20–40 с; запас под медленный ответ
export const maxDuration = 120

const graderKey = () => (process.env.IELTS_GRADER_KEY || '').replace(/^﻿/, '').trim()

async function backend(path, token, init = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Ielts-Grader-Key': graderKey(),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, body }
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }
  const attemptId = Number(body?.attemptId)
  if (!Number.isInteger(attemptId) || attemptId <= 0) return Response.json({ error: 'attempt_required' }, { status: 400 })
  const uiLang = ['ru', 'kk', 'en'].includes(body?.uiLang) ? body.uiLang : 'ru'
  const token = bearerFromRequest(request)
  if (!token) return Response.json({ error: 'auth_required' }, { status: 401 })
  if (!graderKey() || !hasAnthropicKey()) return Response.json({ error: 'grading_unavailable' }, { status: 503 })

  const quota = await checkIeltsQuota(request, null, 'writing')
  if (quota.blocked) return Response.json({ error: 'quota' }, { status: 429 })

  const claim = await backend(`/mobile/ielts/attempts/${attemptId}/grading`, token, { method: 'POST' })
  if (!claim.ok) return Response.json({ error: claim.status === 409 ? 'already' : 'claim_failed' }, { status: claim.status === 409 ? 409 : claim.status === 404 ? 404 : 502 })
  const job = claim.body

  let assessment
  try {
    const raw = await structured({ systemPrompt: buildSystemPrompt(job, uiLang), userMessage: userMessage(job), schema: WRITING_SCHEMA, model: IELTS_REVIEW_MODEL, effort: 'medium', timeoutMs: 90_000 })
    assessment = normalizeAssessment(raw, job.text)
  } catch (e) {
    console.error('ielts/writing/assess model failed:', e?.message || e)
    await backend(`/mobile/ielts/attempts/${attemptId}/grading/fail`, token, { method: 'POST', body: JSON.stringify({ reason: 'model' }) })
    return Response.json({ error: 'model_failed' }, { status: 502 })
  }

  const saved = await backend(`/mobile/ielts/attempts/${attemptId}/grading`, token, {
    method: 'PUT',
    body: JSON.stringify({ ...assessment, provider: 'anthropic', feedbackLanguage: uiLang }),
  })
  if (!saved.ok) {
    await backend(`/mobile/ielts/attempts/${attemptId}/grading/fail`, token, { method: 'POST', body: JSON.stringify({ reason: 'save' }) })
    return Response.json({ error: 'save_failed' }, { status: 502 })
  }

  // квота IELTS считается по своей таблице (lib/db/ielts.js) — без этой строки оценка Writing её не тратила бы
  if (isDbConfigured() && !('error' in quota.resolved)) {
    try {
      await recordIeltsWriting({ profileId: quota.resolved.id, promptShown: job.testId, essay: job.text, assessment: { task: job.taskKind, overallBand: saved.body?.attempt?.band, criteria: assessment.criteria }, provider: 'anthropic' })
    } catch (e) {
      console.error('ielts/writing/assess quota record failed (non-fatal):', e?.message || e)
    }
  }
  return Response.json(saved.body)
}
