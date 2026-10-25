// Оценка ответов Speaking из банка: multipart { testId, mode, uiLang, items: JSON [{ itemId, durationSec }],
// audio_<i>: WAV 16 кГц на каждый ответ } с токеном ученика.
//
// 1. квота IELTS (Speaking — платная секция) — ДО платных вызовов;
// 2. бэкенд создаёт работу «в оценке» (токен + служебный ключ): вопросы берутся из задания, а не от клиента;
// 3. по каждому ответу параллельно — текст (Azure Fast → Soniox) и произношение (Azure, кусками по минуте), как в
//    «Ситуациях»: прод за Cloudflare рвёт запрос после 100 с молчания, последовательно четыре ответа не уложатся;
// 4. Sonnet → три критерия по стенограммам (не ответил — запасная модель, см. gradeSpeaking); 5. результат на
//    бэкенд, общий band считает он.
// Невнятный ответ (тишина, обрывок, не английский, файл не собрался) пропускается и в оценку не идёт; ошибка
// ученику — только если пропущены все.
//
// Записи никуда не сохраняются: после оценки остаются только стенограммы. Поэтому повторной оценки нет — упала
// модель, ученик переписывает ответ (работа помечается failed).

import { hasAnthropicKey, IELTS_REVIEW_MODEL, structured } from '@/lib/anthropic.js'
import { BACKEND_URL, bearerFromRequest } from '@/lib/auth-server.js'
import { checkIeltsQuota } from '@/lib/ielts/quota.js'
import { isDbConfigured, recordIeltsSpeaking } from '@/lib/db/ielts.js'
import { gradeSpeaking } from '@/lib/ielts/speakingGrader.js'
import { answersPronunciation, savedItems, transcribeAnswers } from '@/lib/ielts/speakingAnswers.js'

export const runtime = 'nodejs'
export const maxDuration = 120

// 10 минут речи 16 кГц mono ≈ 19 МБ: больше на одну попытку экзамен не даёт (Part 2 — 2 минуты, Part 1/3 — 5–6 ответов)
const MAX_TOTAL_BYTES = 20 * 1024 * 1024
const MAX_ITEMS = 8
// id задания идёт в путь запроса к бэкенду со служебным ключом: encodeURIComponent('..') остаётся '..', и путь
// /tests/../speaking съехал бы на соседнюю ручку
const TEST_ID_RE = /^[\w-]{1,64}$/

// Прод за Cloudflare рвёт молчащий запрос через 100 с (см. «Аркаду»). Весь роут — не дольше 90 с: распознавание
// не ждём дольше STT_DEADLINE_MS, модели отдаём остаток; попытку, на которую времени не осталось, gradeSpeaking не
// начинает — честнее fail, чем 524 с оценкой, которую сервер всё равно допишет и оплатит.
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
  // Файла ответа нет или он пустой (запись не собралась на устройстве) — этот ответ пропускается, а не роняет оценку
  // остальных; ни одного файла — отказ сразу, работа не создаётся.
  const audio = []
  let total = 0
  for (let i = 0; i < meta.length; i++) {
    const f = form.get(`audio_${i}`)
    if (!(f instanceof File) || !f.size) {
      audio.push(null)
      continue
    }
    total += f.size
    if (total > MAX_TOTAL_BYTES) return Response.json({ error: 'too_large' }, { status: 413 })
    audio.push(Buffer.from(await f.arrayBuffer()))
  }
  if (!audio.some(Boolean)) return Response.json({ error: 'no_speech' }, { status: 422 })

  const quota = await checkIeltsQuota(request, null, 'speaking')
  if (quota.blocked) return Response.json({ error: 'quota' }, { status: 429 })

  const items = meta.map((m) => ({ itemId: String(m.itemId), durationSec: Math.max(0, Math.min(600, Number(m.durationSec) || 0)) }))
  const start = await backend(`/mobile/ielts/tests/${encodeURIComponent(testId)}/speaking`, token, {
    method: 'POST',
    body: JSON.stringify({ mode, items, timeSec: Math.round(items.reduce((a, x) => a + x.durationSec, 0)), device: 'web' }),
  })
  if (!start.ok) {
    // Раньше любой отказ бэкенда уходил «start_failed» → экран писал общее «Оценка не удалась. Попробуйте ещё раз»,
    // хотя повтор тут не поможет: 401 — истёк вход, 403/503 — ключ грейдера стенда не совпал с бэкендом (так
    // выглядит локальный веб с чужим IELTS_GRADER_KEY). Статус — в лог, иначе причину не найти.
    console.error('ielts/speaking/assess: backend start failed', start.status, start.body?.messages?.[0] || start.body?.message || '')
    if (start.status === 401) return Response.json({ error: 'auth_required' }, { status: 401 })
    if (start.status === 403 || start.status === 503) return Response.json({ error: 'grading_unavailable' }, { status: 503 })
    return Response.json({ error: 'start_failed' }, { status: start.status === 400 || start.status === 404 ? start.status : 502 })
  }
  const job = start.body
  // attemptId в ответе об ошибке: работа уже создана и помечена failed — полный mock закрывает ею секцию («проверка не
  // удалась», а не дыра в экзамене); вне mock экран его не читает
  const fail = (reason) => backend(`/mobile/ielts/attempts/${job.attemptId}/grading/fail`, token, { method: 'POST', body: JSON.stringify({ reason }) })

  // Дальше работа уже создана: любой сбой обязан пометить её failed и ответить JSON-ом — не HTML-страницей 500,
  // из которой экран не достанет ни кода, ни attemptId для полного mock.
  let per
  let graded
  let saved
  try {
    per = await transcribeAnswers(items, audio, { deadlineMs: STT_DEADLINE_MS })
    if (per.every((a) => a.skipped)) {
      await fail('no_speech')
      return Response.json({ error: 'no_speech', attemptId: job.attemptId }, { status: 422 })
    }

    try {
      graded = await gradeSpeaking({ run: structured, model: IELTS_REVIEW_MODEL, job, answers: per, uiLang, pronunciation: answersPronunciation(per), deadline: startedAt + TOTAL_BUDGET_MS })
    } catch (e) {
      console.error('ielts/speaking/assess model failed:', e?.message || e)
      await fail('model')
      return Response.json({ error: 'model_failed', attemptId: job.attemptId }, { status: 502 })
    }

    const engines = { stt: per.find((a) => a.stt)?.stt || null, pronunciation: per.some((a) => !a.skipped && a.accuracy != null) ? 'azure' : null, model: graded.model }
    console.log(JSON.stringify({ kind: 'ielts_speaking_assess', ...engines, items: per.length, skipped: per.filter((a) => a.skipped).length, attempt: graded.attempt, ms: Date.now() - startedAt }))
    saved = await backend(`/mobile/ielts/attempts/${job.attemptId}/grading`, token, {
      method: 'PUT',
      body: JSON.stringify({
        criteria: graded.criteria,
        feedback: graded.feedback,
        strengths: graded.strengths,
        improvements: graded.improvements,
        items: savedItems(per),
        engines,
        provider: 'anthropic',
        feedbackLanguage: uiLang,
      }),
    })
    if (!saved.ok) {
      console.error('ielts/speaking/assess: backend save failed', saved.status, saved.body?.messages?.[0] || saved.body?.message || '')
      await fail('save')
      return Response.json({ error: 'save_failed', attemptId: job.attemptId }, { status: 502 })
    }
  } catch (e) {
    console.error('ielts/speaking/assess failed:', e?.message || e)
    await fail('error').catch(() => null)
    return Response.json({ error: 'failed', attemptId: job.attemptId }, { status: 500 })
  }

  // квота IELTS считается по своей таблице (lib/db/ielts.js) — без этой строки оценка Speaking её не тратила бы
  if (isDbConfigured() && !('error' in quota.resolved)) {
    try {
      await recordIeltsSpeaking({ profileId: quota.resolved.id, taskId: testId, answers: per.filter((a) => !a.skipped).map((a) => ({ question: a.itemId, transcript: a.transcript })), assessment: { overallBand: saved.body?.attempt?.band, criteria: graded.criteria }, provider: 'anthropic' })
    } catch (e) {
      console.error('ielts/speaking/assess quota record failed (non-fatal):', e?.message || e)
    }
  }
  return Response.json(saved.body)
}
