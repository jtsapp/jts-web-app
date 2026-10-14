// Говорение теста уровня v16: multipart { audio (WAV 16 кГц mono, до трёх минут), metadata (JSON) } → уровень CEFR.
// Тест зовёт это через свой крючок Speaking Buddy (src/placement/bridge.js), а ответ { status, speaking_level,
// confidence, subscores } v16 принимает как есть (validateSpeaking автора).
//
// Конвейер — «Ситуаций» и SpeakSpin: произношение Azure стартует сразу и идёт параллельно с текстом (Azure Fast →
// текст оценки произношения → Soniox), затем грейдер на Sonnet. Параллельно и кусками — потому что прод за Cloudflare
// рвёт запрос после 100 с молчания, а запись здесь до трёх минут.
//
// Тему НЕ принимаем текстом с клиента: роут ищет её по topicId в src/placement/speakingTopics.js.
//
// Лимит — свой, а не дневной SpeakSpin: тест проходят при первом входе, и демо-ученик, который уже потратил пять
// разборов SpeakSpin, иначе остался бы без говорения в тесте. Три оценки в сутки на профиль хватает на пересдачу и
// пару повторов после обрыва сети; счётчик в памяти процесса — рестарт его обнуляет, и это допустимая щедрость.

import { assessPronunciationChunked, isAzureSpeechConfigured, transcribeWavFast } from '@/lib/ielts/azure-pronunciation.js'
import { transcribeWavSoniox, isSonioxConfigured } from '@/lib/soniox-stt.js'
import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { wavSeconds } from '@/lib/db/shadowingBudget.js'
import { buildSpeakingPrompt, SPEAKING_LEVELS, SPEAKING_SCHEMA } from '@/lib/placement/speakingPrompt.js'
import { MAX_SECONDS, MIN_SECONDS, topicById } from '@/placement/speakingTopics.js'

export const runtime = 'nodejs'

// Три минуты WAV 16 кГц mono ≈ 5.8 МБ; 7 МБ — запас на заголовок. Ниже потолка nginx (32m).
const MAX_BYTES = 7 * 1024 * 1024
// Меньше — оценивать нечего (тишина, «hello»): уровень не называем, оценку возвращаем в лимит.
const MIN_WORDS = 12
const DAILY_LIMIT = 3

const usage = new Map() // profileId → { day, count }

function today() {
  return new Date().toISOString().slice(0, 10)
}

function take(profileId) {
  const day = today()
  const u = usage.get(profileId)
  const count = u && u.day === day ? u.count : 0
  if (count >= DAILY_LIMIT) return false
  usage.set(profileId, { day, count: count + 1 })
  if (usage.size > 5000) usage.delete(usage.keys().next().value)
  return true
}

function giveBack(profileId) {
  const u = usage.get(profileId)
  if (u && u.count > 0) u.count--
}

function graderModel() {
  return String(process.env.PLACEMENT_SPEAKING_MODEL || '').replace(/^﻿/, '').trim() || 'claude-sonnet-5-5'
}

const countWords = (s) => (String(s || '').match(/[A-Za-z']+/g) || []).length
const cefrOrNull = (v) => (SPEAKING_LEVELS.includes(v) ? v : null)

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
      console.error('[placement.speaking] soniox stt failed', e)
      return ''
    })
    return { text: text.trim(), stt: 'soniox' }
  }
  return { text: '', stt: null }
}

function parseMeta(raw) {
  let m = {}
  try {
    m = JSON.parse(String(raw || '{}')) || {}
  } catch {
    return null
  }
  const lang = ['ru', 'kk', 'en'].includes(m.lang) ? m.lang : 'ru'
  const measured = {}
  for (const k of ['grammar', 'reading', 'listening']) measured[k] = cefrOrNull(m.measured?.[k])
  return { topicId: String(m.topicId || ''), lang, measured }
}

export async function GET() {
  return Response.json({ configured: (isAzureSpeechConfigured() || isSonioxConfigured()) && hasAnthropicKey() })
}

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  let form
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'bad_form' }, { status: 400 })
  }
  const file = form.get('audio')
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: 'no_audio' }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: 'recording_too_long' }, { status: 413 })

  const meta = parseMeta(form.get('metadata'))
  const topic = meta && topicById(meta.topicId)
  if (!topic) return Response.json({ error: 'bad_topic' }, { status: 400 })

  const seconds = wavSeconds(file.size)
  if (seconds < MIN_SECONDS) return Response.json({ error: 'too_short', seconds }, { status: 400 })
  if (seconds > MAX_SECONDS + 5) return Response.json({ error: 'recording_too_long' }, { status: 413 })
  if (!(isAzureSpeechConfigured() || isSonioxConfigured()) || !hasAnthropicKey()) {
    return Response.json({ error: 'not_configured' }, { status: 503 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  if (!take(resolved.id)) return Response.json({ error: 'daily_limit_reached' }, { status: 429 })

  const buf = Buffer.from(await file.arrayBuffer())
  const startedAt = Date.now()
  const pronP = isAzureSpeechConfigured()
    ? assessPronunciationChunked(buf).catch((e) => {
        console.error('[placement.speaking] azure pronunciation failed', e)
        return null
      })
    : Promise.resolve(null)

  const { text: transcript, stt } = await transcribe(buf, pronP)
  const words = countWords(transcript)
  const log = (status, extra = {}) =>
    console.log(JSON.stringify({ kind: 'placement_speaking', status, stt, words, seconds: Math.round(seconds), ms: Date.now() - startedAt, ...extra }))

  if (words < MIN_WORDS) {
    giveBack(resolved.id)
    log('insufficient')
    return Response.json({ status: 'insufficient', transcript, reason: words === 0 ? 'no_speech' : 'too_few_words' })
  }

  const pronRaw = await pronP
  const pron = pronRaw && !pronRaw.mock ? pronRaw : null
  const model = graderModel()
  const graded = await structured({
    ...buildSpeakingPrompt({ topic, transcript, seconds, words, pron, measured: meta.measured, feedbackLanguage: meta.lang }),
    schema: SPEAKING_SCHEMA,
    model,
    maxOutputTokens: 1500,
    timeoutMs: 40_000,
    maxRetries: 1,
  }).catch((e) => {
    console.error('[placement.speaking] grader failed', e)
    return null
  })

  const level = cefrOrNull(graded?.level)
  if (!level) {
    giveBack(resolved.id)
    log('failed', { pronunciation: !!pron })
    return Response.json({ error: 'grader_failed' }, { status: 502 })
  }

  log('assessed', { level, pronunciation: !!pron, model })
  return Response.json({
    status: 'completed',
    speaking_level: level,
    confidence: ['low', 'medium', 'high'].includes(graded.confidence) ? graded.confidence : 'low',
    subscores: {
      range: graded.range,
      accuracy: graded.accuracy,
      fluency: graded.fluency,
      coherence: graded.coherence,
      pronunciation: pron ? Math.round(pron.overall ?? 0) : null,
    },
    summary: String(graded.summary || ''),
    strengths: Array.isArray(graded.strengths) ? graded.strengths.slice(0, 3).map(String) : [],
    improvements: Array.isArray(graded.improvements) ? graded.improvements.slice(0, 3).map(String) : [],
    transcript,
    topicId: topic.id,
  })
}
