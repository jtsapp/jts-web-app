// IELTS Writing band-scoring. Sonnet grades against the official public band
// descriptors; Task 1 is graded multimodally (the same chart the learner saw is
// attached, so a fluent misreading of the data can't score well).
//
// Ported from felix app/api/ielts/assess-writing/route.ts. The provider gateway
// there (Sonnet → Gemini → mock) collapses to Sonnet → mock: this app has no
// Gemini key.

import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { isDbConfigured, recordIeltsWriting } from '@/lib/db/ielts.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { DEMO_TASK1_CHART_PNG_BASE64 } from '@/lib/ielts/demo-task1-chart.js'

export const runtime = 'nodejs'

// The model returns the four criterion bands + evidence; the overall band is
// computed here (IELTS rounding), never trusted from the model.
const CRITERIA = ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange']

const WRITING_SCHEMA = {
  type: 'OBJECT',
  properties: {
    taskResponse: { type: 'NUMBER' },
    coherenceCohesion: { type: 'NUMBER' },
    lexicalResource: { type: 'NUMBER' },
    grammaticalRange: { type: 'NUMBER' },
    errors: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          quote: { type: 'STRING' },
          issue: { type: 'STRING' },
          correction: { type: 'STRING' },
          criterion: {
            type: 'STRING',
            enum: ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange'],
          },
        },
        required: ['quote', 'issue', 'correction', 'criterion'],
      },
    },
    rewrites: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          original: { type: 'STRING' },
          improved: { type: 'STRING' },
        },
        required: ['original', 'improved'],
      },
    },
    feedback: { type: 'STRING' },
  },
  required: [
    'taskResponse',
    'coherenceCohesion',
    'lexicalResource',
    'grammaticalRange',
    'errors',
    'rewrites',
    'feedback',
  ],
}

// Round to the nearest 0.5 band and clamp to the valid IELTS range (0–9).
function roundBand(n) {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 5
  const clamped = Math.max(0, Math.min(9, v))
  return Math.round(clamped * 2) / 2
}

// IELTS overall = arithmetic mean of the four criteria, rounded to nearest 0.5.
function overall(c) {
  const mean =
    (c.taskResponse + c.coherenceCohesion + c.lexicalResource + c.grammaticalRange) / 4
  return Math.round(mean * 2) / 2
}

function normalize(raw, task, uiLang) {
  const criteria = {
    taskResponse: roundBand(raw.taskResponse),
    coherenceCohesion: roundBand(raw.coherenceCohesion),
    lexicalResource: roundBand(raw.lexicalResource),
    grammaticalRange: roundBand(raw.grammaticalRange),
  }

  const errors = Array.isArray(raw.errors)
    ? raw.errors
        .filter((e) => !!e && typeof e === 'object')
        .map((e) => ({
          quote: String(e.quote ?? '').trim(),
          issue: String(e.issue ?? '').trim(),
          correction: String(e.correction ?? '').trim(),
          criterion: CRITERIA.includes(e.criterion) ? e.criterion : 'grammaticalRange',
        }))
        .filter((e) => e.quote.length > 0 && e.issue.length > 0)
        .slice(0, 8)
    : []

  const rewrites = Array.isArray(raw.rewrites)
    ? raw.rewrites
        .filter((r) => !!r && typeof r === 'object')
        .map((r) => ({
          original: String(r.original ?? '').trim(),
          improved: String(r.improved ?? '').trim(),
        }))
        .filter((r) => r.original.length > 0 && r.improved.length > 0)
        .slice(0, 4)
    : []

  const feedback =
    typeof raw.feedback === 'string' && raw.feedback.trim().length > 0
      ? raw.feedback.trim().slice(0, 700)
      : uiLang === 'ru'
        ? 'Оценка выполнена. Смотри разбор по критериям выше.'
        : uiLang === 'kk'
          ? 'Бағалау аяқталды. Критерийлер бойынша талдауды жоғарыдан қараңыз.'
          : 'Assessment complete. See the per-criterion breakdown above.'

  return { task, criteria, overallBand: overall(criteria), errors, rewrites, feedback }
}

function buildSystemPrompt(task, promptShown, uiLang) {
  const fbLang = uiLang === 'ru' ? 'Russian' : uiLang === 'kk' ? 'Kazakh' : 'English'
  const taskLabel =
    task === 'task1'
      ? 'IELTS Academic Writing Task 1 (summarise the attached chart/graph/table in ≥150 words)'
      : 'IELTS Writing Task 2 (argumentative essay in ≥250 words)'
  const firstCriterion = task === 'task1' ? 'Task Achievement' : 'Task Response'

  const inputNote =
    task === 'task1'
      ? `- The chart the candidate had to describe is ATTACHED as an image. Judge Task Achievement by comparing the candidate's text against the actual data in the image: reward accurate key features, trends and comparisons; penalise invented, missing or wrong figures. Do NOT reward a fluent description that misreads the chart.`
      : `- Input is TEXT ONLY. Do NOT comment on handwriting, accent, or anything you cannot see.`

  return `You are a certified IELTS Writing examiner. Grade this response strictly against the official public band descriptors. The candidate needs an accurate band, not encouragement. Under-marking and over-marking are equally failures.

TASK
- ${taskLabel}
- Prompt shown to candidate: "${promptShown}"
${inputNote}

THE FOUR CRITERIA (score each 0–9, half-bands allowed: 5.0, 5.5, 6.0, …)
1. ${firstCriterion} (field: taskResponse) — does it fully address all parts of the prompt, develop a clear position, and support ideas? Off-topic or under-length caps this low.
2. Coherence & Cohesion (field: coherenceCohesion) — logical progression, paragraphing, cohesive devices used naturally (not mechanically).
3. Lexical Resource (field: lexicalResource) — range, precision, collocation, spelling. Repetitive basic vocabulary caps at 5–6.
4. Grammatical Range & Accuracy (field: grammaticalRange) — range of structures AND error density. Frequent errors that impede meaning cap at 5.

CALIBRATION ANCHORS (apply the SAME standard — do not drift generous)
- Band 5: limited range, frequent errors, ideas present but under-developed or partly off-topic.
- Band 6: competent, addresses the task, some complex structures, errors present but meaning clear.
- Band 7: good control, clear position throughout, flexible vocabulary, error-free sentences frequent.
- Band 8: wide range, rare errors, fully developed, natural cohesion.
- Under-length (Task 2 < 250 words, Task 1 < 150) → taskResponse cannot exceed 6, and note it.
- Memorised/template phrasing padding the answer → lower Coherence and Lexical.

EVIDENCE RULES (mandatory)
- errors: 3–8 items. Each MUST quote a VERBATIM span from the candidate's text (field "quote"), give a 3–8 word diagnosis ("issue"), a corrected form ("correction"), and which criterion it hits ("criterion" = one of taskResponse|coherenceCohesion|lexicalResource|grammaticalRange). Never invent a quote that is not in the text.
- rewrites: 1–4 of the candidate's weakest sentences rewritten to ~band 7–8. "original" MUST be a verbatim sentence from the text; "improved" is your upgrade. If the text is too short to have weak sentences, return fewer.
- feedback: 2–3 sentences in ${fbLang}. Lead with the overall band call and the single highest-impact fix. No generic praise.

DO NOT compute or return an overall band — the server computes it from your four criteria. Return ONLY the tool call with the four criterion bands, errors, rewrites, and feedback.`
}

// The chart image a Task 1 response must be graded against. For now a single
// bundled demo asset (base64 module, so it ships inside the serverless function
// rather than needing a runtime read of /public, which Vercel doesn't include).
function loadTaskImages(task) {
  if (task !== 'task1') return []
  return [{ mimeType: 'image/png', dataBase64: DEMO_TASK1_CHART_PNG_BASE64 }]
}

// Deterministic fallback when NO live provider is configured, so the UI still
// renders. Not a real assessment — flagged mode:"mock", provider:"mock".
function fallbackAssessment(task, uiLang) {
  const criteria = {
    taskResponse: 6,
    coherenceCohesion: 6,
    lexicalResource: 5.5,
    grammaticalRange: 5.5,
  }
  return {
    task,
    criteria,
    overallBand: overall(criteria),
    errors: [],
    rewrites: [],
    feedback:
      uiLang === 'ru'
        ? 'Демо-результат: модель оценки не подключена (нет API-ключа). Это заглушка для макета.'
        : uiLang === 'kk'
          ? 'Демо-нәтиже: бағалау моделі қосылмаған. Бұл макет үшін толтырғыш.'
          : 'Demo result: no scoring model configured. Placeholder for the mockup.',
  }
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON in request body.' }, { status: 400 })
  }

  const essay = (body.essay ?? '').trim()
  if (!essay) {
    return Response.json({ error: 'Please write your essay before submitting.' }, { status: 400 })
  }
  if (essay.length > 6000) {
    return Response.json(
      { error: 'Essay is too long. Keep it under 6000 characters.' },
      { status: 400 },
    )
  }

  const task = body.task === 'task1' ? 'task1' : 'task2'
  const uiLang =
    body.uiLang === 'ru' || body.uiLang === 'en' || body.uiLang === 'kk' ? body.uiLang : 'ru'
  const promptShown =
    typeof body.promptShown === 'string' && body.promptShown.length > 0
      ? body.promptShown.slice(0, 600)
      : '(prompt unknown)'

  // Produce the assessment (live Sonnet, or deterministic fallback). Recording
  // and the response shape are unified below so every path persists.
  let assessment
  let mode
  let provider

  if (!hasAnthropicKey()) {
    assessment = fallbackAssessment(task, uiLang)
    mode = 'mock'
    provider = 'mock'
  } else {
    try {
      const raw = await structured({
        systemPrompt: buildSystemPrompt(task, promptShown, uiLang),
        userMessage: essay,
        schema: WRITING_SCHEMA,
        images: loadTaskImages(task),
      })
      assessment = normalize(raw, task, uiLang)
      mode = 'live'
      provider = 'anthropic'
    } catch (error) {
      console.error('ielts/assess-writing falling back to mock:', error)
      assessment = fallbackAssessment(task, uiLang)
      mode = 'mock'
      provider = 'mock'
    }
  }

  // Best-effort persistence. Scoring must never fail because of the DB, so we
  // only save when identity resolves cleanly and swallow write errors.
  const saved = await persistAttempt(request, body.deviceId, {
    promptShown,
    essay,
    assessment,
    provider,
  })

  return Response.json({ assessment, mode, provider, saved })
}

// Save the attempt + score, returning whether it persisted. Never throws:
// unconfigured DB, unresolved/forbidden identity, or a write error all → false,
// leaving the caller's assessment response intact.
async function persistAttempt(request, deviceId, data) {
  if (!isDbConfigured()) return false
  try {
    const resolved = await resolveProfileId(request, deviceId ?? null)
    if ('error' in resolved) return false // anonymous-without-id or forbidden
    const result = await recordIeltsWriting({
      profileId: resolved.id,
      promptShown: data.promptShown,
      essay: data.essay,
      assessment: data.assessment,
      provider: data.provider,
    })
    return result !== null
  } catch (err) {
    console.error('ielts/assess-writing persist failed (non-fatal):', err)
    return false
  }
}
