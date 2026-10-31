// Оценка Writing и Speaking диагностики: multipart { attemptId, skill: writing|speaking, uiLang, items?: JSON
// [{ itemId, durationSec }], audio_<i>?: WAV 16 кГц } с токеном ученика.
//
// Своей работы у секций диагностики нет — состояние и разбор лежат в самой попытке (backend IeltsDiagnosticGrading).
// Конвейер тот же, что у банка (writing/assess, speaking/assess): claim со служебным ключом → модель → результат на
// бэкенд, band и окончательный overall считает он. Квоту IELTS диагностика не тратит: она бесплатна, как и раньше
// (стартовый уровень нужен до покупки), а лимит — одна оценка на секцию, повтор после «done» бэкенд отклоняет 409.
// Упавшую секцию (failed) бэкенд отдаёт на оценку снова — экран итога повторяет её теми же записями с устройства.
//
// Отладка — как у speaking/assess: debugId в ответе, заголовке и строке лога `ielts_speaking_assess` (route
// diagnostic), он же в failReason секции.

import { hasAnthropicKey, IELTS_REVIEW_MODEL, structured } from '@/lib/anthropic.js'
import { BACKEND_URL, bearerFromRequest } from '@/lib/auth-server.js'
import { WRITING_SCHEMA, buildSystemPrompt as writingPrompt, normalizeAssessment, userMessage as writingMessage } from '@/lib/ielts/writingGrader.js'
import { gradeSpeaking } from '@/lib/ielts/speakingGrader.js'
import { answersDebug, answersPronunciation, savedItems, transcribeAnswers } from '@/lib/ielts/speakingAnswers.js'
import { createAssessTrace } from '@/lib/ielts/assessTrace.js'

export const runtime = 'nodejs'
export const maxDuration = 120

// Ответов в диагностике до пяти (Part 1 — три-четыре вопроса, монолог), речи — до ~6 минут
const MAX_TOTAL_BYTES = 20 * 1024 * 1024
const MAX_ITEMS = 8
// Прод за Cloudflare рвёт молчащий запрос через 100 с — бюджет как у speaking/assess
const TOTAL_BUDGET_MS = 90_000
const STT_DEADLINE_MS = 40_000

const graderKey = () => (process.env.IELTS_GRADER_KEY || '').replace(/^﻿/, '').trim()

async function backend(path, token, init = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'X-Ielts-Grader-Key': graderKey(), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, body }
}

const backendError = (r) => ({ status: r.status, message: String(r.body?.messages?.[0] || r.body?.message || '').slice(0, 160) })
const claimError = (trace, claim) => {
  trace.set('stage', 'claim')
  trace.set('backend', backendError(claim))
  if (claim.status === 409) return { error: 'already', status: 409 }
  return { error: 'claim_failed', status: claim.status === 400 || claim.status === 404 ? claim.status : 502 }
}

export async function POST(request) {
  const trace = createAssessTrace('diagnostic')
  const reply = (body, status) => trace.respond(body, status)
  const token = bearerFromRequest(request)
  if (!token) return reply({ error: 'auth_required' }, 401)
  if (!graderKey() || !hasAnthropicKey()) {
    trace.set('missing', [!graderKey() && 'IELTS_GRADER_KEY', !hasAnthropicKey() && 'ANTHROPIC_API_KEY'].filter(Boolean))
    return reply({ error: 'grading_unavailable' }, 503)
  }
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > MAX_TOTAL_BYTES + 64 * 1024) return reply({ error: 'too_large' }, 413)

  let form
  try {
    form = await request.formData()
  } catch (e) {
    trace.set('detail', String(e?.message || e).slice(0, 120))
    return reply({ error: 'bad_form' }, 400)
  }
  trace.mark('upload')
  const attemptId = Number(form.get('attemptId'))
  const skill = form.get('skill')
  const uiLang = ['ru', 'kk', 'en'].includes(form.get('uiLang')) ? form.get('uiLang') : 'ru'
  if (!Number.isInteger(attemptId) || attemptId <= 0) return reply({ error: 'attempt_required' }, 400)
  if (skill !== 'writing' && skill !== 'speaking') return reply({ error: 'bad_skill' }, 400)
  trace.set('attemptId', attemptId)
  trace.set('skill', skill)
  const base = `/mobile/ielts/diagnostic/attempts/${attemptId}/grading/${skill}`
  const fail = (code, detail) => backend(`${base}/fail`, token, { method: 'POST', body: JSON.stringify({ reason: trace.reason(code, detail) }) })

  if (skill === 'writing') {
    const claim = await backend(base, token, { method: 'POST' })
    trace.mark('claim')
    if (!claim.ok) {
      const { error, status } = claimError(trace, claim)
      return reply({ error }, status)
    }
    const job = claim.body
    let assessment
    trace.set('stage', 'model')
    try {
      const raw = await structured({ systemPrompt: writingPrompt(job, uiLang), userMessage: writingMessage(job), schema: WRITING_SCHEMA, model: IELTS_REVIEW_MODEL, effort: 'medium', timeoutMs: 80_000, maxRetries: 0 })
      assessment = normalizeAssessment(raw, job.text)
    } catch (e) {
      trace.mark('model')
      trace.set('model', { errors: [String(e?.message || e).slice(0, 200)] })
      await fail('model', e?.message)
      return reply({ error: 'model_failed' }, 502)
    }
    trace.mark('model')
    trace.set('stage', 'save')
    const saved = await backend(base, token, { method: 'PUT', body: JSON.stringify({ ...assessment, provider: 'anthropic', feedbackLanguage: uiLang }) })
    trace.mark('save')
    if (!saved.ok) {
      trace.set('backend', backendError(saved))
      await fail('save', `backend ${saved.status}`)
      return reply({ error: 'save_failed' }, 502)
    }
    trace.set('stage', 'done')
    return reply(saved.body)
  }

  let meta = []
  try {
    meta = JSON.parse(String(form.get('items') || '[]'))
  } catch {
    /* проверка ниже */
  }
  if (!Array.isArray(meta) || !meta.length || meta.length > MAX_ITEMS || meta.some((m) => !m || typeof m !== 'object')) return reply({ error: 'bad_items' }, 400)
  const audio = []
  let total = 0
  for (let i = 0; i < meta.length; i++) {
    const f = form.get(`audio_${i}`)
    // запись не собралась — этот ответ пропускается, как невнятный (см. speaking/assess)
    if (!(f instanceof File) || !f.size) {
      audio.push(null)
      continue
    }
    total += f.size
    if (total > MAX_TOTAL_BYTES) return reply({ error: 'too_large' }, 413)
    audio.push(Buffer.from(await f.arrayBuffer()))
  }
  trace.set('bytes', total)
  if (!audio.some(Boolean)) {
    trace.set('stage', 'upload')
    return reply({ error: 'no_speech' }, 422)
  }
  const items = meta.map((m) => ({ itemId: String(m.itemId), durationSec: Math.max(0, Math.min(600, Number(m.durationSec) || 0)) }))
  const claim = await backend(base, token, { method: 'POST', body: JSON.stringify({ items }) })
  trace.mark('claim')
  if (!claim.ok) {
    const { error, status } = claimError(trace, claim)
    return reply({ error }, status)
  }
  const job = claim.body

  // секция уже взята в оценку: любой сбой — fail и JSON, иначе она так и висела бы «в оценке»
  try {
    trace.set('stage', 'stt')
    const per = await transcribeAnswers(items, audio, { deadlineMs: STT_DEADLINE_MS })
    trace.mark('stt')
    trace.set('answers', answersDebug(per))
    if (per.every((x) => x.skipped)) {
      await fail('no_speech', per.map((a) => a.reason).join(','))
      return reply({ error: 'no_speech' }, 422)
    }
    let graded
    trace.set('stage', 'model')
    try {
      graded = await gradeSpeaking({ run: structured, model: IELTS_REVIEW_MODEL, job, answers: per, uiLang, pronunciation: answersPronunciation(per), deadline: trace.startedAt + TOTAL_BUDGET_MS })
    } catch (e) {
      trace.mark('model')
      trace.set('model', { errors: e?.attempts || [String(e?.message || e).slice(0, 200)] })
      await fail('model', (e?.attempts || []).join(' | ') || e?.message)
      return reply({ error: 'model_failed' }, 502)
    }
    trace.mark('model')
    trace.set('model', { model: graded.model, attempt: graded.attempt, ...(graded.errors?.length ? { errors: graded.errors } : {}) })
    trace.set('stage', 'save')
    const saved = await backend(base, token, {
      method: 'PUT',
      body: JSON.stringify({
        criteria: graded.criteria,
        feedback: graded.feedback,
        strengths: graded.strengths,
        improvements: graded.improvements,
        items: savedItems(per),
        provider: 'anthropic',
        feedbackLanguage: uiLang,
      }),
    })
    trace.mark('save')
    if (!saved.ok) {
      trace.set('backend', backendError(saved))
      await fail('save', `backend ${saved.status}`)
      return reply({ error: 'save_failed' }, 502)
    }
    trace.set('stage', 'done')
    return reply(saved.body)
  } catch (e) {
    trace.set('detail', String(e?.message || e).slice(0, 200))
    await fail('error', e?.message).catch(() => null)
    return reply({ error: 'failed' }, 500)
  }
}
