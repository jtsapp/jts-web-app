// Оценка работы Writing из банка бэкенда: POST { attemptId, uiLang } с токеном ученика.
//
// 1. квота IELTS (Writing — платная секция) — ДО платного вызова;
// 2. claim на бэкенде (токен ученика + служебный ключ): работа своя и ждёт оценки, текст и задание — оттуда;
// 3. Sonnet → критерии и флаги ограничений и, параллельно, «закрепление» (упражнения по ошибкам) и «наставник» (улучшение по предложениям, советы по развитию, эссе целиком —
//    coachWriting; не ответил — разбор без этих блоков); 4. результат на бэкенд, общий band считает он. Модель
//    оценки не ответила — fail, работа снова ждёт.
//
// Ключ IELTS_GRADER_KEY знает только сервер: без него бэкенд не отдаст работу на оценку и не примет band.

import { hasAnthropicKey, IELTS_REVIEW_MODEL, structured } from '@/lib/anthropic.js'
import { BACKEND_URL, bearerFromRequest } from '@/lib/auth-server.js'
import { checkIeltsQuota } from '@/lib/ielts/quota.js'
import { isDbConfigured, recordIeltsWriting } from '@/lib/db/ielts.js'
import { WRITING_SCHEMA, buildSystemPrompt, coachWriting, exercisesWriting, normalizeAssessment, userMessage } from '@/lib/ielts/writingGrader.js'

export const runtime = 'nodejs'
// оценка эссе Sonnet'ом — 20–40 с; запас под медленный ответ
export const maxDuration = 120

// Прод за Cloudflare рвёт молчащий запрос через 100 с. Без maxRetries SDK повторил бы зависший вызов ещё дважды
// (до 3×90 с): ученик видит 524, а сервер дописывает оценку и платит. Один вызов с запасом под claim и сохранение.
const MODEL_TIMEOUT_MS = 80_000
// «наставника» ждём, пока весь роут не дошёл до 85 с: дальше — сохранение и ответ под 100 с Cloudflare. Обычно он
// приходит вместе с оценкой (~20 с параллельно, замер 25.10.2026).
const COACH_WAIT_UNTIL_MS = 85_000

// Обещание с потолком: по истечении — fallback. Сама работа не отменяется, но роут её больше не ждёт.
function withDeadline(promise, ms, fallback) {
  let timer
  return Promise.race([promise, new Promise((resolve) => (timer = setTimeout(() => resolve(fallback), ms)))]).finally(() => clearTimeout(timer))
}

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
  const startedAt = Date.now()
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

  // «наставник» идёт параллельно оценке и не бросает: ждать его дольше оценки незачем, а его сбой оценку не роняет
  const coachP = coachWriting({ run: structured, model: IELTS_REVIEW_MODEL, job, uiLang, timeoutMs: MODEL_TIMEOUT_MS })
  // «закрепление» (упражнения по ошибкам) — третий параллельный вызов с тем же потолком: короткий JSON, не тормозит
  const exercisesP = exercisesWriting({ run: structured, model: IELTS_REVIEW_MODEL, job, uiLang, timeoutMs: MODEL_TIMEOUT_MS })
  let assessment
  try {
    const raw = await structured({ systemPrompt: buildSystemPrompt(job, uiLang), userMessage: userMessage(job), schema: WRITING_SCHEMA, model: IELTS_REVIEW_MODEL, effort: 'medium', timeoutMs: MODEL_TIMEOUT_MS, maxRetries: 0 })
    assessment = normalizeAssessment(raw, job.text)
  } catch (e) {
    console.error('ielts/writing/assess model failed:', e?.message || e)
    await backend(`/mobile/ielts/attempts/${attemptId}/grading/fail`, token, { method: 'POST', body: JSON.stringify({ reason: 'model' }) })
    return Response.json({ error: 'model_failed' }, { status: 502 })
  }

  const waitLeft = () => Math.max(0, startedAt + COACH_WAIT_UNTIL_MS - Date.now())
  const [coach, exercises] = await Promise.all([withDeadline(coachP, waitLeft(), null), withDeadline(exercisesP, waitLeft(), [])])
  if (coach) assessment.details = { ...assessment.details, ...coach }
  // контракт §2/§4: упражнения — верхним полем оценки, бэкенд хранит их в result.exercises
  if (exercises.length) assessment.exercises = exercises

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
