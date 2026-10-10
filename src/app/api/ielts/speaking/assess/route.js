// Оценка ответов Speaking из банка: multipart { testId, mode, uiLang, items: JSON [{ itemId, durationSec }],
// audio_<i>: WAV 16 кГц на каждый ответ } с токеном ученика.
//
// 1. квота IELTS (Speaking — платная секция) — ДО платных вызовов;
// 2. бэкенд создаёт работу «в оценке» (токен + служебный ключ): вопросы берутся из задания, а не от клиента;
// 3. по каждому ответу параллельно — текст (Azure Fast → Soniox) и произношение (Azure, кусками по минуте), как в
//    «Ситуациях»: прод за Cloudflare рвёт запрос после 100 с молчания, последовательно четыре ответа не уложатся;
// 4. Sonnet → три критерия по стенограммам; 5. результат на бэкенд, общий band считает он.
//
// Записи никуда не сохраняются: после оценки остаются только стенограммы. Поэтому повторной оценки нет — упала
// модель, ученик переписывает ответ (работа помечается failed).

import { hasAnthropicKey, IELTS_REVIEW_MODEL, structured } from '@/lib/anthropic.js'
import { BACKEND_URL, bearerFromRequest } from '@/lib/auth-server.js'
import { checkIeltsQuota } from '@/lib/ielts/quota.js'
import { assessPronunciationChunked, isAzureSpeechConfigured, transcribeWavFast } from '@/lib/ielts/azure-pronunciation.js'
import { isSonioxConfigured, transcribeWavSoniox } from '@/lib/soniox-stt.js'
import { isDbConfigured, recordIeltsSpeaking } from '@/lib/db/ielts.js'
import { SPEAKING_SCHEMA, buildSystemPrompt, normalizeSpeaking, userMessage } from '@/lib/ielts/speakingGrader.js'
import { pronunciationBand, wordsPerMinute } from '@/ielts/speaking/speaking.js'

export const runtime = 'nodejs'
export const maxDuration = 120

// 10 минут речи 16 кГц mono ≈ 19 МБ: больше на одну попытку экзамен не даёт (Part 2 — 2 минуты, Part 1/3 — 5–6 ответов)
const MAX_TOTAL_BYTES = 20 * 1024 * 1024
const MAX_ITEMS = 8
// id задания идёт в путь запроса к бэкенду со служебным ключом: encodeURIComponent('..') остаётся '..', и путь
// /tests/../speaking съехал бы на соседнюю ручку
const TEST_ID_RE = /^[\w-]{1,64}$/

// Прод за Cloudflare рвёт молчащий запрос через 100 с (см. «Аркаду»). Весь роут — не дольше 90 с: распознавание
// не ждём дольше STT_DEADLINE_MS, модели отдаём остаток, но не меньше MIN_MODEL_MS — иначе честнее сразу fail,
// чем 524 с оценкой, которую сервер всё равно допишет и оплатит.
const TOTAL_BUDGET_MS = 90_000
const STT_DEADLINE_MS = 40_000
const MODEL_TIMEOUT_MS = 60_000
const MIN_MODEL_MS = 20_000

// Обещание с потолком: по истечении — fallback. Сама работа не отменяется, но роут её больше не ждёт.
function withDeadline(promise, ms, fallback) {
  let timer
  return Promise.race([promise, new Promise((resolve) => (timer = setTimeout(() => resolve(fallback), ms)))]).finally(() => clearTimeout(timer))
}

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

// Текст ответа: быстрый путь Azure, без него — текст самой оценки произношения, затем Soniox (как в «Ситуациях»).
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
  // Заведомо большое тело отсекаем до formData(): иначе до 20+ МБ читаются в память контейнера по любому «Bearer x»
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > MAX_TOTAL_BYTES + 64 * 1024) return Response.json({ error: 'too_large' }, { status: 413 })

  let form
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'bad_form' }, { status: 400 })
  }
  const testId = String(form.get('testId') || '')
  const mode = form.get('mode') === 'practice' ? 'practice' : 'exam'
  const uiLang = ['ru', 'kk', 'en'].includes(form.get('uiLang')) ? form.get('uiLang') : 'ru'
  let meta = []
  try {
    meta = JSON.parse(String(form.get('items') || '[]'))
  } catch {
    /* проверка ниже */
  }
  if (!TEST_ID_RE.test(testId) || !Array.isArray(meta) || !meta.length || meta.length > MAX_ITEMS || meta.some((m) => !m || typeof m !== 'object')) return Response.json({ error: 'bad_items' }, { status: 400 })
  const audio = []
  let total = 0
  for (let i = 0; i < meta.length; i++) {
    const f = form.get(`audio_${i}`)
    if (!(f instanceof File) || !f.size) return Response.json({ error: 'missing_audio' }, { status: 400 })
    total += f.size
    if (total > MAX_TOTAL_BYTES) return Response.json({ error: 'too_large' }, { status: 413 })
    audio.push(Buffer.from(await f.arrayBuffer()))
  }

  const quota = await checkIeltsQuota(request, null, 'speaking')
  if (quota.blocked) return Response.json({ error: 'quota' }, { status: 429 })

  const items = meta.map((m) => ({ itemId: String(m.itemId), durationSec: Math.max(0, Math.min(600, Number(m.durationSec) || 0)) }))
  const start = await backend(`/mobile/ielts/tests/${encodeURIComponent(testId)}/speaking`, token, {
    method: 'POST',
    body: JSON.stringify({ mode, items, timeSec: Math.round(items.reduce((a, x) => a + x.durationSec, 0)), device: 'web' }),
  })
  if (!start.ok) return Response.json({ error: 'start_failed' }, { status: start.status === 400 || start.status === 404 ? start.status : 502 })
  const job = start.body
  // attemptId в ответе об ошибке: работа уже создана и помечена failed — полный mock закрывает ею секцию («проверка не
  // удалась», а не дыра в экзамене); вне mock экран его не читает
  const fail = (reason) => backend(`/mobile/ielts/attempts/${job.attemptId}/grading/fail`, token, { method: 'POST', body: JSON.stringify({ reason }) })

  const per = await Promise.all(
    audio.map(async (buf, i) => {
      const pronP = isAzureSpeechConfigured() ? withDeadline(assessPronunciationChunked(buf).catch(() => null), STT_DEADLINE_MS, null) : Promise.resolve(null)
      const [{ text, stt }, pron] = await Promise.all([transcribe(buf, pronP), pronP])
      return { ...items[i], transcript: text, stt, wpm: wordsPerMinute(text, items[i].durationSec), accuracy: pron && !pron.mock ? pron.accuracy : null }
    }),
  )
  if (!per.some((a) => a.transcript)) {
    await fail('no_speech')
    return Response.json({ error: 'no_speech', attemptId: job.attemptId }, { status: 422 })
  }

  const modelMs = Math.min(MODEL_TIMEOUT_MS, TOTAL_BUDGET_MS - (Date.now() - startedAt))
  if (modelMs < MIN_MODEL_MS) {
    console.error('ielts/speaking/assess: no time left for the model after STT,', Date.now() - startedAt, 'ms')
    await fail('timeout')
    return Response.json({ error: 'timeout', attemptId: job.attemptId }, { status: 504 })
  }

  let graded
  try {
    const raw = await structured({ systemPrompt: buildSystemPrompt(job.task?.part, uiLang), userMessage: userMessage(job, per), schema: SPEAKING_SCHEMA, model: IELTS_REVIEW_MODEL, effort: 'medium', maxOutputTokens: 900, timeoutMs: modelMs, maxRetries: 0 })
    graded = normalizeSpeaking(raw, pronunciationBand(per.map((a) => ({ accuracy: a.accuracy, durationSec: a.durationSec }))))
  } catch (e) {
    console.error('ielts/speaking/assess model failed:', e?.message || e)
    await fail('model')
    return Response.json({ error: 'model_failed', attemptId: job.attemptId }, { status: 502 })
  }

  const engines = { stt: per.find((a) => a.stt)?.stt || null, pronunciation: per.some((a) => a.accuracy != null) ? 'azure' : null }
  console.log(JSON.stringify({ kind: 'ielts_speaking_assess', ...engines, items: per.length, ms: Date.now() - startedAt }))
  const saved = await backend(`/mobile/ielts/attempts/${job.attemptId}/grading`, token, {
    method: 'PUT',
    body: JSON.stringify({
      criteria: graded.criteria,
      feedback: graded.feedback,
      strengths: graded.strengths,
      improvements: graded.improvements,
      items: per.map(({ itemId, durationSec, transcript, wpm, accuracy }) => ({ itemId, durationSec, transcript, wpm, accuracy })),
      engines,
      provider: 'anthropic',
      feedbackLanguage: uiLang,
    }),
  })
  if (!saved.ok) {
    await fail('save')
    return Response.json({ error: 'save_failed', attemptId: job.attemptId }, { status: 502 })
  }

  // квота IELTS считается по своей таблице (lib/db/ielts.js) — без этой строки оценка Speaking её не тратила бы
  if (isDbConfigured() && !('error' in quota.resolved)) {
    try {
      await recordIeltsSpeaking({ profileId: quota.resolved.id, taskId: testId, answers: per.map((a) => ({ question: a.itemId, transcript: a.transcript })), assessment: { overallBand: saved.body?.attempt?.band, criteria: graded.criteria }, provider: 'anthropic' })
    } catch (e) {
      console.error('ielts/speaking/assess quota record failed (non-fatal):', e?.message || e)
    }
  }
  return Response.json(saved.body)
}
