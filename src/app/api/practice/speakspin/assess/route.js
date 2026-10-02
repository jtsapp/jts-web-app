// Разбор устного ответа «SpeakSpin»: multipart { audio (16кГц mono WAV),
// metadata (JSON) } → ответ по контракту прототипа v1 (см.
// lib/speakspin/feedback.js): транскрипт, четыре оси от грейдера, произношение
// от Azure, исправления с точными цитатами и улучшенный ответ.
//
// Конвейер скопирован с «Ситуаций» (app/api/practice/situations/assess) и
// держит тот же порядок, потому что все звенья платные:
//   1. отсечь мусор (короткая/длинная запись, чужая тема) — БЕСПЛАТНО;
//   2. повтор той же попытки (Idempotency-Key) отдать из памяти — без списания:
//      сеть на телефоне рвётся, клиент шлёт снова, а студент не должен за это
//      терять попытку;
//   3. списать разбор из дневного лимита — ДО платных вызовов;
//   4. произношение (Azure) стартует сразу, параллельно с ним текст; если речи
//      нет или в ней меньше пяти слов — разбор возвращается в бюджет.
//
// Тему НЕ принимаем текстом с клиента: роут ищет её в topics.json по topicId.
// Иначе в доверенную часть промпта грейдера можно было бы подсунуть что угодно.
//
// Гостю разбор не положен: по device-id дневной лимит обходится одним
// рестартом браузера.

import { assessPronunciationChunked, isAzureSpeechConfigured, transcribeWavFast } from '@/lib/ielts/azure-pronunciation.js'
import { transcribeWavSoniox, isSonioxConfigured } from '@/lib/soniox-stt.js'
import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { buildAssessPrompt, ASSESS_SCHEMA } from '@/lib/speakspin/assessPrompt.js'
import { composeAssessed, composeInsufficient, countWords, MIN_WORDS } from '@/lib/speakspin/feedback.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { wavSeconds } from '@/lib/db/shadowingBudget.js'
import { budgetPayload, consume, dayKey, getUsed, refund } from '@/lib/db/speakspinBudget.js'
import { parseMetadata } from '@/lib/speakspin/metadata.js'

export const runtime = 'nodejs'

// Модель грейдера. Env — чтобы откатить модель на стенде без релиза; BOM из
// Windows-пайпа срезаем, как и у остальных env (см. CLAUDE.md, инцидент с
// BACKEND_URL).
function graderModel() {
  return String(process.env.SPEAKSPIN_MODEL || '').replace(/^\uFEFF/, '').trim() || 'claude-sonnet-5-5'
}

// Клиент режет запись на 60 секундах. 16кГц mono WAV ≈ 32 КБ/с → минута ≈
// 1.9 МБ; 4 МБ — запас на заголовок и округления, а не на вторую минуту.
// Обязан оставаться НИЖЕ client_max_body_size на nginx (32m), иначе прокси
// отдаёт голый 413 без кода.
const MAX_BYTES = 4 * 1024 * 1024

// Короче — «эээ» и случайное касание кнопки: не списываем, платное не зовём.
const MIN_SECONDS = 1.5

// Повтор той же попытки. Память процесса, а не БД: окно повтора — секунды или
// минуты (обрыв сети), а при рестарте контейнера худшее, что случится, —
// повторное списание одной попытки. Храним и незавершённый запрос (промис):
// двойной тап, прилетевший, пока первый ещё разбирается, ждёт его же ответ, а
// не списывает вторую попытку.
const CACHE_TTL_MS = 30 * 60 * 1000
const CACHE_MAX = 500
const replayCache = new Map()

function cacheGet(key) {
  const hit = replayCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    replayCache.delete(key)
    return null
  }
  return hit.promise
}

function cachePut(key, promise) {
  // Map хранит порядок вставки — первым вытесняется самый старый.
  while (replayCache.size >= CACHE_MAX) replayCache.delete(replayCache.keys().next().value)
  replayCache.set(key, { at: Date.now(), promise })
}

function isSttConfigured() {
  return isAzureSpeechConfigured() || isSonioxConfigured()
}

// Как в «Ситуациях»: Azure Fast → текст из оценки произношения → Soniox.
// Возвращает { text, stt }, stt — чем реально распознали, уходит в ответ и лог.
async function transcribe(buf, pronP) {
  if (isAzureSpeechConfigured()) {
    const fast = await transcribeWavFast(buf)
    if (fast != null) return { text: fast.trim(), stt: 'azure-fast' }
    const pron = await pronP
    const text = String(pron?.transcript || '').trim()
    if (text) return { text, stt: 'azure' }
  }
  if (isSonioxConfigured()) {
    const text = await transcribeWavSoniox(buf, { lang: 'en' }).catch((e) => {
      console.error('[speakspin.assess] soniox stt failed', e)
      return ''
    })
    return { text: text.trim(), stt: 'soniox' }
  }
  return { text: '', stt: null }
}

// Статус для клиента: есть ли чем разбирать и остаток дневного лимита. Гостю
// budget = null — клиент прячет кнопку разбора. azure — заданы ли ключи Azure:
// без них разбор идёт без произношения (analysisScope 'transcript_only').
export async function GET(request) {
  const base = { configured: isSttConfigured() && hasAnthropicKey(), azure: isAzureSpeechConfigured() }
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return Response.json({ ...base, budget: null })
  if (!isDbConfigured()) return Response.json({ ...base, budget: null })
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  try {
    const used = await getUsed(resolved.id, dayKey(new Date()))
    return Response.json({ ...base, budget: budgetPayload(used, resolved.isDemoAccount) })
  } catch (e) {
    console.error('[speakspin.assess] budget status failed', e)
    return Response.json({ ...base, budget: null })
  }
}

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  let form
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: "Expected multipart/form-data with an 'audio' file." }, { status: 400 })
  }

  const file = form.get('audio')
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'audio' file field." }, { status: 400 })
  }
  if (file.size === 0) {
    return Response.json({ error: 'Audio file is empty.' }, { status: 400 })
  }

  const meta = parseMetadata(form.get('metadata'), request.headers.get('idempotency-key'))
  if (meta.error) return Response.json({ error: meta.error }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: 'recording_too_long', limitMb: Math.floor(MAX_BYTES / (1024 * 1024)) },
      { status: 413 },
    )
  }
  const seconds = wavSeconds(file.size)
  if (seconds < MIN_SECONDS) {
    return Response.json({ error: 'too_short', seconds }, { status: 400 })
  }
  if (!isSttConfigured() || !hasAnthropicKey()) {
    return Response.json({ error: 'not_configured' }, { status: 503 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  // Ключ включает язык: тот же ответ, разобранный по-казахски, — другой разбор.
  const cacheKey = `${resolved.id}|${meta.attemptId}|${meta.feedbackLanguage}`
  const replay = cacheGet(cacheKey)
  if (replay) {
    const { status, body } = await replay
    return Response.json(body, { status })
  }

  const work = assess({ file, seconds, meta, profileId: resolved.id, isDemo: resolved.isDemoAccount })
  cachePut(cacheKey, work)
  const result = await work
  // Повтор отдаём только успешный разбор: ошибку или «мало речи» студент
  // вправе переиграть той же попыткой — она не списана.
  if (!(result.status === 200 && result.body?.status === 'assessed')) replayCache.delete(cacheKey)
  return Response.json(result.body, { status: result.status })
}

// Платная часть. Возвращает { status, body } — промис кладётся в кэш повторов.
async function assess({ file, seconds, meta, profileId, isDemo }) {
  const today = dayKey(new Date())
  const lang = meta.feedbackLanguage
  const recordingDurationMs = meta.recordingDurationMs ?? Math.round(seconds * 1000)

  let charged = false
  let usedNow = null
  if (isDbConfigured()) {
    try {
      const after = await consume(profileId, today, isDemo)
      if (after == null) {
        let used = null
        try {
          used = await getUsed(profileId, today)
        } catch {
          /* показать что есть */
        }
        return { status: 429, body: { error: 'daily_limit_reached', budget: budgetPayload(used, isDemo) } }
      }
      charged = true
      usedNow = after
    } catch (e) {
      // Сбой БД не роняет разбор: fail-open, как в «Ситуациях». Один вызов
      // ограничен минутой записи, риск перерасхода мал.
      console.error('[speakspin.assess] budget consume failed', e)
    }
  }

  const giveBack = async () => {
    if (!charged) return
    try {
      await refund(profileId, today)
      usedNow = usedNow == null ? null : Math.max(0, usedNow - 1)
      charged = false
    } catch (e) {
      console.error('[speakspin.assess] budget refund failed', e)
    }
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const startedAt = Date.now()
  const model = graderModel()

  // Произношение — самое долгое звено и текста не ждёт, поэтому стартует
  // первым и идёт параллельно с распознаванием и грейдером.
  const pronP = isAzureSpeechConfigured()
    ? assessPronunciationChunked(buf).catch((e) => {
        console.error('[speakspin.assess] azure pronunciation failed', e)
        return null
      })
    : Promise.resolve(null)

  const { text: transcript, stt } = await transcribe(buf, pronP)
  const words = countWords(transcript)

  const log = (status, extra = {}) =>
    console.log(
      JSON.stringify({
        kind: 'speakspin_assess',
        status,
        stt,
        model,
        words,
        seconds: Math.round(seconds),
        ms: Date.now() - startedAt,
        ...extra,
      }),
    )

  if (words < MIN_WORDS) {
    // Тишина, шум или «yes, I think» — разбирать нечего, попытку возвращаем.
    await giveBack()
    const reason = words === 0 ? 'no_speech' : 'too_few_words'
    log('insufficient_audio', { reason })
    return {
      status: 200,
      body: composeInsufficient({
        attemptId: meta.attemptId,
        transcript,
        reason,
        lang,
        recordingDurationMs,
        budget: budgetPayload(usedNow, isDemo),
        engines: { stt, pronunciation: false, model: null },
      }),
    }
  }

  const [pron, graded] = await Promise.all([
    pronP,
    structured({
      ...buildAssessPrompt({
        topic: meta.topic,
        transcript,
        feedbackLanguage: lang,
        learnerLevel: meta.learnerLevel,
        mode: meta.mode,
        supportUsed: meta.supportUsed,
        recordingSeconds: seconds,
      }),
      schema: ASSESS_SCHEMA,
      model,
      maxOutputTokens: 3000,
      // Прод за Cloudflare рвёт запрос после 100 с молчания: один повтор по
      // 40 с плюс распознавание укладываются, SDK-шные два повтора — нет.
      timeoutMs: 40_000,
      maxRetries: 1,
    }).catch((e) => {
      console.error('[speakspin.assess] grader failed', e)
      return null
    }),
  ])

  const pronOk = Boolean(pron && !pron.mock)
  const engines = { stt, pronunciation: pronOk, model }

  if (!graded || typeof graded !== 'object') {
    // Грейдер — сердце разбора: без него показывать нечего и брать попытку
    // нельзя.
    await giveBack()
    log('failed', { pronunciation: pronOk })
    return { status: 502, body: { error: 'grader_failed', budget: budgetPayload(usedNow, isDemo) } }
  }

  log('assessed', { pronunciation: pronOk })
  return {
    status: 200,
    body: composeAssessed({
      attemptId: meta.attemptId,
      transcript,
      graded,
      pron: pronOk ? pron : null,
      lang,
      recordingDurationMs,
      budget: budgetPayload(usedNow, isDemo),
      engines,
    }),
  }
}
