// Оценка Writing и Speaking диагностики: multipart { attemptId, skill: writing|speaking, uiLang, items?: JSON
// [{ itemId, durationSec }], audio_<i>?: WAV 16 кГц } с токеном ученика.
//
// Своей работы у секций диагностики нет — состояние и разбор лежат в самой попытке (backend IeltsDiagnosticGrading).
// Конвейер тот же, что у банка (writing/assess, speaking/assess): claim со служебным ключом → модель → результат на
// бэкенд, band и окончательный overall считает он. Квоту IELTS диагностика не тратит: она бесплатна, как и раньше
// (стартовый уровень нужен до покупки), а лимит — одна оценка на секцию, повтор после «done» бэкенд отклоняет 409.

import { hasAnthropicKey, IELTS_REVIEW_MODEL, structured } from '@/lib/anthropic.js'
import { BACKEND_URL, bearerFromRequest } from '@/lib/auth-server.js'
import { WRITING_SCHEMA, buildSystemPrompt as writingPrompt, normalizeAssessment, userMessage as writingMessage } from '@/lib/ielts/writingGrader.js'
import { gradeSpeaking } from '@/lib/ielts/speakingGrader.js'
import { answersPronunciation, savedItems, transcribeAnswers } from '@/lib/ielts/speakingAnswers.js'

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

export async function POST(request) {
  const startedAt = Date.now()
  const token = bearerFromRequest(request)
  if (!token) return Response.json({ error: 'auth_required' }, { status: 401 })
  if (!graderKey() || !hasAnthropicKey()) return Response.json({ error: 'grading_unavailable' }, { status: 503 })
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > MAX_TOTAL_BYTES + 64 * 1024) return Response.json({ error: 'too_large' }, { status: 413 })

  let form
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'bad_form' }, { status: 400 })
  }
  const attemptId = Number(form.get('attemptId'))
  const skill = form.get('skill')
  const uiLang = ['ru', 'kk', 'en'].includes(form.get('uiLang')) ? form.get('uiLang') : 'ru'
  if (!Number.isInteger(attemptId) || attemptId <= 0) return Response.json({ error: 'attempt_required' }, { status: 400 })
  if (skill !== 'writing' && skill !== 'speaking') return Response.json({ error: 'bad_skill' }, { status: 400 })
  const base = `/mobile/ielts/diagnostic/attempts/${attemptId}/grading/${skill}`
  const fail = (reason) => backend(`${base}/fail`, token, { method: 'POST', body: JSON.stringify({ reason }) })

  if (skill === 'writing') {
    const claim = await backend(base, token, { method: 'POST' })
    if (!claim.ok) return Response.json({ error: claim.status === 409 ? 'already' : 'claim_failed' }, { status: claim.status === 409 ? 409 : claim.status === 404 ? 404 : 502 })
    const job = claim.body
    let assessment
    try {
      const raw = await structured({ systemPrompt: writingPrompt(job, uiLang), userMessage: writingMessage(job), schema: WRITING_SCHEMA, model: IELTS_REVIEW_MODEL, effort: 'medium', timeoutMs: 80_000, maxRetries: 0 })
      assessment = normalizeAssessment(raw, job.text)
    } catch (e) {
      console.error('ielts/diagnostic/assess writing model failed:', e?.message || e)
      await fail('model')
      return Response.json({ error: 'model_failed' }, { status: 502 })
    }
    const saved = await backend(base, token, { method: 'PUT', body: JSON.stringify({ ...assessment, provider: 'anthropic', feedbackLanguage: uiLang }) })
    if (!saved.ok) {
      await fail('save')
      return Response.json({ error: 'save_failed' }, { status: 502 })
    }
    return Response.json(saved.body)
  }

  let meta = []
  try {
    meta = JSON.parse(String(form.get('items') || '[]'))
  } catch {
    /* проверка ниже */
  }
  if (!Array.isArray(meta) || !meta.length || meta.length > MAX_ITEMS || meta.some((m) => !m || typeof m !== 'object')) return Response.json({ error: 'bad_items' }, { status: 400 })
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
    if (total > MAX_TOTAL_BYTES) return Response.json({ error: 'too_large' }, { status: 413 })
    audio.push(Buffer.from(await f.arrayBuffer()))
  }
  if (!audio.some(Boolean)) return Response.json({ error: 'no_speech' }, { status: 422 })
  const items = meta.map((m) => ({ itemId: String(m.itemId), durationSec: Math.max(0, Math.min(600, Number(m.durationSec) || 0)) }))
  const claim = await backend(base, token, { method: 'POST', body: JSON.stringify({ items }) })
  if (!claim.ok) return Response.json({ error: claim.status === 409 ? 'already' : 'claim_failed' }, { status: claim.status === 409 ? 409 : claim.status === 400 || claim.status === 404 ? claim.status : 502 })
  const job = claim.body

  // секция уже взята в оценку: любой сбой — fail и JSON, иначе она так и висела бы «в оценке»
  try {
    const per = await transcribeAnswers(items, audio, { deadlineMs: STT_DEADLINE_MS })
    if (per.every((x) => x.skipped)) {
      await fail('no_speech')
      return Response.json({ error: 'no_speech' }, { status: 422 })
    }
    let graded
    try {
      graded = await gradeSpeaking({ run: structured, model: IELTS_REVIEW_MODEL, job, answers: per, uiLang, pronunciation: answersPronunciation(per), deadline: startedAt + TOTAL_BUDGET_MS })
    } catch (e) {
      console.error('ielts/diagnostic/assess speaking model failed:', e?.message || e)
      await fail('model')
      return Response.json({ error: 'model_failed' }, { status: 502 })
    }
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
    if (!saved.ok) {
      await fail('save')
      return Response.json({ error: 'save_failed' }, { status: 502 })
    }
    return Response.json(saved.body)
  } catch (e) {
    console.error('ielts/diagnostic/assess speaking failed:', e?.message || e)
    await fail('error').catch(() => null)
    return Response.json({ error: 'failed' }, { status: 500 })
  }
}
