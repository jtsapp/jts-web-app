// IELTS Speaking (0–9 band). Fluency/Lexical/Grammar are scored by Sonnet from
// the transcript; Pronunciation comes from Azure on the Part 2 monologue audio
// (mock when Azure is unconfigured). Everything degrades gracefully.
//
// Ported from felix app/api/ielts/assess-speaking/route.ts. Difference: felix
// falls back to Gemini STT when Azure is absent; this app has no Gemini key, so
// without Azure there is no Part 2 transcript at all and the language criteria
// fall back to the mock.

import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { isDbConfigured, recordIeltsSpeaking } from '@/lib/db/ielts.js'
import {
  assessPronunciation,
  mockPronunciation,
  pronScoreToBand,
} from '@/lib/ielts/azure-pronunciation.js'
import { IELTS_SPEAKING_TASK } from '@/data/ielts-tasks.js'

export const runtime = 'nodejs'

const MAX_BYTES = 10 * 1024 * 1024

// Sonnet returns the three transcript-graded criteria + feedback; Pronunciation
// is added from Azure afterwards.
const SPEAKING_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fluencyCoherence: { type: 'NUMBER' },
    lexicalResource: { type: 'NUMBER' },
    grammaticalRange: { type: 'NUMBER' },
    strengths: { type: 'ARRAY', items: { type: 'STRING' } },
    improvements: { type: 'ARRAY', items: { type: 'STRING' } },
    feedback: { type: 'STRING' },
  },
  required: ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'feedback'],
}

function roundBand(n) {
  return Math.max(0, Math.min(9, Math.round(n * 2) / 2))
}

function strList(v, cap) {
  return Array.isArray(v)
    ? v
        .filter((x) => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, cap)
    : []
}

function buildSystemPrompt(uiLang) {
  const fb = uiLang === 'ru' ? 'Russian' : uiLang === 'kk' ? 'Kazakh' : 'English'
  return `You are an official IELTS Speaking examiner. Score this candidate's spoken answers on the 0–9 IELTS band scale (whole or .5 steps) using ONLY three criteria, from the TRANSCRIPT:
- fluencyCoherence: Fluency & Coherence — flow, hesitation, linking, staying on topic (as visible in the transcript: restarts, fillers "um/uh", one-word answers, sentence completeness).
- lexicalResource: range and precision of vocabulary, collocation, paraphrase.
- grammaticalRange: variety and accuracy of structures.

DO NOT score pronunciation — you cannot hear the audio; that criterion is graded separately. The transcript came from speech-to-text: ignore obvious recognition noise (missing punctuation, merged words) and judge the LANGUAGE, not the STT quality. If the candidate answered partly in another language, judge only the English produced.

Be honest and calibrated — a real diagnosis, not encouragement. Short one-word answers ⇒ low bands regardless of topic.

OUTPUT: fluencyCoherence, lexicalResource, grammaticalRange as numbers 0–9 (.5 steps); strengths (0–2 short specific phrases, empty OK); improvements (0–2 short diagnosable phrases); feedback (2–3 sentences in ${fb}, lead with the honest band, name one concrete focus). Return ONLY the JSON object.`
}

function buildUserMessage(answers) {
  return answers.map((a) => `[Part ${a.part}] Q: ${a.question}\nA: ${a.transcript}`).join('\n\n')
}

// Deterministic language scores when no provider is available.
function mockLanguage(uiLang) {
  return {
    fluencyCoherence: 5.5,
    lexicalResource: 5.5,
    grammaticalRange: 5.5,
    strengths: [],
    improvements: [],
    feedback:
      uiLang === 'ru'
        ? 'Оценка речи выполнена в демо-режиме. Настрой ключи, чтобы получить разбор.'
        : uiLang === 'kk'
          ? 'Сөйлеу бағасы демо-режимде жасалды.'
          : 'Speaking scored in demo mode. Configure keys for a full breakdown.',
  }
}

export async function POST(request) {
  let form
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'Expected multipart/form-data.' }, { status: 400 })
  }

  const file = form.get('audio')
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Missing 'audio'." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'Audio too large.' }, { status: 413 })
  }

  // Part 1 transcripts (+ the Part 2 question) travel as a JSON blob.
  let answers = []
  try {
    const raw = JSON.parse(String(form.get('answers') ?? '[]'))
    if (Array.isArray(raw)) {
      answers = raw
        .filter((a) => a && typeof a.transcript === 'string')
        .map((a) => ({
          part: a.part === 2 ? 2 : 1,
          question: String(a.question ?? '').slice(0, 400),
          transcript: String(a.transcript ?? '').slice(0, 2000),
        }))
    }
  } catch {
    /* answers optional */
  }

  const uiLang =
    form.get('uiLang') === 'ru' ? 'ru' : form.get('uiLang') === 'kk' ? 'kk' : 'en'
  const deviceId = typeof form.get('deviceId') === 'string' ? form.get('deviceId') : undefined

  const wav = Buffer.from(await file.arrayBuffer())

  // 1) Pronunciation + Part 2 transcript. Azure, else mock (no Gemini here).
  let pron
  let part2Transcript = ''
  let pronEngine = 'mock'
  const azure = await assessPronunciation(wav).catch((e) => {
    console.error('[ielts.speaking] azure failed', e)
    return null
  })
  if (azure) {
    pron = {
      accuracy: azure.accuracy,
      fluency: azure.fluency,
      completeness: azure.completeness,
      prosody: azure.prosody,
      overall: azure.overall,
      mock: false,
    }
    part2Transcript = azure.transcript
    pronEngine = 'azure'
  } else {
    pron = mockPronunciation()
  }

  // Attach the Part 2 transcript to its answer slot for the language scorer.
  const part2Q = IELTS_SPEAKING_TASK.part2.prompt
  if (part2Transcript.trim()) {
    const existing = answers.find((a) => a.part === 2)
    if (existing) existing.transcript = part2Transcript.trim().slice(0, 2000)
    else
      answers.push({
        part: 2,
        question: part2Q,
        transcript: part2Transcript.trim().slice(0, 2000),
      })
  }

  // 2) Language criteria (Sonnet → mock).
  let lang
  let langEngine = 'mock'
  const hasTranscript = answers.some((a) => a.transcript.trim().length > 0)
  if (hasAnthropicKey() && hasTranscript) {
    try {
      const raw = await structured({
        systemPrompt: buildSystemPrompt(uiLang),
        userMessage: buildUserMessage(answers),
        schema: SPEAKING_SCHEMA,
      })
      lang = {
        fluencyCoherence: roundBand(Number(raw.fluencyCoherence) || 5),
        lexicalResource: roundBand(Number(raw.lexicalResource) || 5),
        grammaticalRange: roundBand(Number(raw.grammaticalRange) || 5),
        strengths: strList(raw.strengths, 2),
        improvements: strList(raw.improvements, 2),
        feedback:
          typeof raw.feedback === 'string' && raw.feedback.trim()
            ? raw.feedback.trim().slice(0, 600)
            : mockLanguage(uiLang).feedback,
      }
      langEngine = 'anthropic'
    } catch (e) {
      console.error('[ielts.speaking] language scoring failed', e)
      lang = mockLanguage(uiLang)
    }
  } else {
    lang = mockLanguage(uiLang)
  }

  // 3) Combine into the four criteria + overall band.
  const criteria = {
    fluencyCoherence: lang.fluencyCoherence,
    lexicalResource: lang.lexicalResource,
    grammaticalRange: lang.grammaticalRange,
    pronunciation: pronScoreToBand(pron.overall),
  }
  const overallBand = roundBand(
    (criteria.fluencyCoherence +
      criteria.lexicalResource +
      criteria.grammaticalRange +
      criteria.pronunciation) /
      4,
  )

  const assessment = {
    criteria,
    overallBand,
    transcript: part2Transcript,
    strengths: lang.strengths,
    improvements: lang.improvements,
    feedback: lang.feedback,
    pronunciation: pron,
  }

  const providerLabel = `${langEngine}+${pronEngine}`
  const mode = langEngine !== 'mock' && pronEngine === 'azure' ? 'live' : 'mock'

  // 4) Best-effort persist.
  let saved = false
  if (isDbConfigured()) {
    try {
      const resolved = await resolveProfileId(request, deviceId ?? null)
      if (!('error' in resolved)) {
        const written = await recordIeltsSpeaking({
          profileId: resolved.id,
          taskId: IELTS_SPEAKING_TASK.id,
          answers,
          assessment,
          provider: providerLabel,
        })
        saved = written !== null
      }
    } catch (e) {
      console.error('[ielts.speaking] persist failed', e)
    }
  }

  return Response.json({ assessment, mode, provider: providerLabel, saved })
}
