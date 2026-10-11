// Оценка Writing и Speaking диагностики: multipart { attemptId, skill: writing|speaking, uiLang, items?: JSON
// [{ itemId, durationSec }], audio_<i>?: WAV 16 кГц } с токеном ученика.
//
// Своей работы у секций диагностики нет — состояние и разбор лежат в самой попытке (backend IeltsDiagnosticGrading).
// Конвейер тот же, что у банка (writing/assess, speaking/assess): claim со служебным ключом → модель → результат на
// бэкенд, band и окончательный overall считает он. Квоту IELTS диагностика не тратит: она бесплатна, как и раньше
// (стартовый уровень нужен до покупки), а лимит — одна оценка на секцию, повтор после «done» бэкенд отклоняет 409.

import { hasAnthropicKey, IELTS_REVIEW_MODEL, structured } from '@/lib/anthropic.js'
import { BACKEND_URL, bearerFromRequest } from '@/lib/auth-server.js'
import { assessPronunciationChunked, isAzureSpeechConfigured, transcribeWavFast } from '@/lib/ielts/azure-pronunciation.js'
import { isSonioxConfigured, transcribeWavSoniox } from '@/lib/soniox-stt.js'
import { WRITING_SCHEMA, buildSystemPrompt as writingPrompt, normalizeAssessment, userMessage as writingMessage } from '@/lib/ielts/writingGrader.js'
import { SPEAKING_SCHEMA, buildSystemPrompt as speakingPrompt, normalizeSpeaking, userMessage as speakingMessage } from '@/lib/ielts/speakingGrader.js'
import { pronunciationBand, wordsPerMinute } from '@/ielts/speaking/speaking.js'

export const runtime = 'nodejs'
export const maxDuration = 120

// Ответов в диагностике до пяти (Part 1 — три-четыре вопроса, монолог), речи — до ~6 минут
const MAX_TOTAL_BYTES = 20 * 1024 * 1024
const MAX_ITEMS = 8
// Прод за Cloudflare рвёт молчащий запрос через 100 с — бюджет как у speaking/assess
const TOTAL_BUDGET_MS = 90_000
const STT_DEADLINE_MS = 40_000
const MODEL_TIMEOUT_MS = 60_000
const MIN_MODEL_MS = 20_000

const graderKey = () => (process.env.IELTS_GRADER_KEY || '').replace(/^﻿/, '').trim()

function withDeadline(promise, ms, fallback) {
  let timer
  return Promise.race([promise, new Promise((resolve) => (timer = setTimeout(() => resolve(fallback), ms)))]).finally(() => clearTimeout(timer))
}

async function backend(path, token, init = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'X-Ielts-Grader-Key': graderKey(), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, body }
}

async function transcribe(buf, pronP) {
  if (isAzureSpeechConfigured()) {
    const fast = await transcribeWavFast(buf, { timeoutMs: STT_DEADLINE_MS }).catch(() => null)
    if (fast != null) return { text: fast.trim(), stt: 'azure-fast' }
    const pron = await pronP
    const text = String(pron?.transcript || '').trim()
    if (text) return { text, stt: 'azure' }
  }
  if (isSonioxConfigured()) {
    const text = await transcribeWavSoniox(buf, { lang: 'en', timeoutMs: STT_DEADLINE_MS }).catch(() => '')
    return { text: String(text || '').trim(), stt: 'soniox' }
  }
  return { text: '', stt: null }
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
    if (!(f instanceof File) || !f.size) return Response.json({ error: 'missing_audio' }, { status: 400 })
    total += f.size
    if (total > MAX_TOTAL_BYTES) return Response.json({ error: 'too_large' }, { status: 413 })
    audio.push(Buffer.from(await f.arrayBuffer()))
  }
  const items = meta.map((m) => ({ itemId: String(m.itemId), durationSec: Math.max(0, Math.min(600, Number(m.durationSec) || 0)) }))
  const claim = await backend(base, token, { method: 'POST', body: JSON.stringify({ items }) })
  if (!claim.ok) return Response.json({ error: claim.status === 409 ? 'already' : 'claim_failed' }, { status: claim.status === 409 ? 409 : claim.status === 400 || claim.status === 404 ? claim.status : 502 })
  const job = claim.body

  const per = await Promise.all(
    audio.map(async (buf, i) => {
      const pronP = isAzureSpeechConfigured() ? withDeadline(assessPronunciationChunked(buf).catch(() => null), STT_DEADLINE_MS, null) : Promise.resolve(null)
      const [{ text, stt }, pron] = await Promise.all([transcribe(buf, pronP), pronP])
      return { ...items[i], transcript: text, stt, wpm: wordsPerMinute(text, items[i].durationSec), accuracy: pron && !pron.mock ? pron.accuracy : null }
    }),
  )
  if (!per.some((a) => a.transcript)) {
    await fail('no_speech')
    return Response.json({ error: 'no_speech' }, { status: 422 })
  }
  const modelMs = Math.min(MODEL_TIMEOUT_MS, TOTAL_BUDGET_MS - (Date.now() - startedAt))
  if (modelMs < MIN_MODEL_MS) {
    await fail('timeout')
    return Response.json({ error: 'timeout' }, { status: 504 })
  }
  let graded
  try {
    const raw = await structured({ systemPrompt: speakingPrompt(job.task?.part, uiLang), userMessage: speakingMessage(job, per), schema: SPEAKING_SCHEMA, model: IELTS_REVIEW_MODEL, effort: 'medium', maxOutputTokens: 900, timeoutMs: modelMs, maxRetries: 0 })
    graded = normalizeSpeaking(raw, pronunciationBand(per.map((a) => ({ accuracy: a.accuracy, durationSec: a.durationSec }))))
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
      items: per.map(({ itemId, durationSec, transcript, wpm, accuracy }) => ({ itemId, durationSec, transcript, wpm, accuracy })),
      provider: 'anthropic',
      feedbackLanguage: uiLang,
    }),
  })
  if (!saved.ok) {
    await fail('save')
    return Response.json({ error: 'save_failed' }, { status: 502 })
  }
  return Response.json(saved.body)
}
