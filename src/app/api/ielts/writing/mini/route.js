// ИИ-проверка «Мини-эссе» тренировок Writing: POST { testId, roundId, text, uiLang } с токеном ученика (контракт §6).
//
// Раунд (чек-лист, образец, ссылка на задание) сервер берёт у бэкенда сам — из запроса только текст ученика, так что
// ни чек-лист, ни задание не подменить. Проверка тратит не месячную квоту IELTS (её считают оценки band), а свою
// дневную — DAILY_LIMIT на ученика; исчерпанная месячная квота (демо) закрывает и её. Списание — ДО платного вызова,
// возврат, если модель не ответила.

import { hasAnthropicKey, IELTS_REVIEW_MODEL, structured } from '@/lib/anthropic.js'
import { BACKEND_URL, bearerFromRequest } from '@/lib/auth-server.js'
import { checkIeltsQuota } from '@/lib/ielts/quota.js'
import { countIeltsMiniChecksSince, isDbConfigured, recordIeltsMiniCheck, refundIeltsMiniCheck } from '@/lib/db/ielts.js'
import { WRITING_MINI_SCHEMA, buildMiniPrompt, miniUserMessage, normalizeMini } from '@/lib/ielts/writingGrader.js'

export const runtime = 'nodejs'
export const maxDuration = 60

// проверок мини-эссе в сутки на ученика
// (не export: Next.js принимает из route.js только свои поля)
const DAILY_LIMIT = 20
const MODEL_TIMEOUT_MS = 40_000
const MAX_TEXT = 3000

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function loadTest(id, token) {
  const res = await fetch(`${BACKEND_URL}/mobile/ielts/tests/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }
  const testId = typeof body?.testId === 'string' ? body.testId.trim() : ''
  const roundId = typeof body?.roundId === 'string' ? body.roundId.trim() : ''
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!testId || !roundId) return Response.json({ error: 'round_required' }, { status: 400 })
  if (!text) return Response.json({ error: 'empty' }, { status: 400 })
  if (text.length > MAX_TEXT) return Response.json({ error: 'too_long' }, { status: 413 })
  const uiLang = ['ru', 'kk', 'en'].includes(body?.uiLang) ? body.uiLang : 'ru'
  const token = bearerFromRequest(request)
  if (!token) return Response.json({ error: 'auth_required' }, { status: 401 })
  if (!hasAnthropicKey()) return Response.json({ error: 'grading_unavailable' }, { status: 503 })

  // тот же помощник квоты, что у оценки работы: он же проверяет токен
  const quota = await checkIeltsQuota(request, null, 'writing')
  if ('error' in quota.resolved) return Response.json({ error: 'auth_required' }, { status: 401 })
  if (quota.blocked) return Response.json({ error: 'quota' }, { status: 429 })

  const drill = await loadTest(testId, token)
  const round = (drill?.document?.rounds || []).find((r) => r?.id === roundId)
  if (!round || round.kind !== 'free') return Response.json({ error: 'not_found' }, { status: 404 })
  if (drill.document.aiCheck !== true && round.aiCheck !== true) return Response.json({ error: 'not_ai' }, { status: 403 })

  const profileId = quota.resolved.id
  let charge = null
  if (isDbConfigured()) {
    const used = await countIeltsMiniChecksSince(profileId, startOfToday())
    if (used >= DAILY_LIMIT) return Response.json({ error: 'daily_quota', limit: DAILY_LIMIT }, { status: 429 })
    charge = await recordIeltsMiniCheck({ profileId, testId, roundId }).catch(() => null)
  }

  // текст задания — из документа задания, на которое ссылается раунд (task); без него — только текст раунда
  const taskDoc = round.task ? (await loadTest(round.task, token))?.document : null
  const taskText = taskDoc ? [taskDoc.question, ...(taskDoc.bullets || [])].filter(Boolean).join('\n') : ''

  try {
    const raw = await structured({
      systemPrompt: buildMiniPrompt({ round, uiLang }),
      userMessage: miniUserMessage({ round, taskText, text }),
      schema: WRITING_MINI_SCHEMA,
      model: IELTS_REVIEW_MODEL,
      timeoutMs: MODEL_TIMEOUT_MS,
      maxRetries: 0,
      maxOutputTokens: 2000,
    })
    return Response.json({ ok: true, ...normalizeMini(raw, round) })
  } catch (e) {
    console.error('ielts/writing/mini model failed:', e?.message || e)
    await refundIeltsMiniCheck(charge).catch(() => {})
    return Response.json({ error: 'model_failed' }, { status: 502 })
  }
}
