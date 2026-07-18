// Спарк placement grader. Takes the candidate's monologue TRANSCRIPT and has
// Sonnet DETERMINE their CEFR speaking level (lib/anthropic structured() →
// forced-tool JSON). No LiveKit, no usage cap: this route only grades text, so
// there is no talk-time limit. Pronunciation is not scored — the CEFR brief
// judges language, and we have no audio here.

import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { PLACEMENT_TASK } from '@/data/speaking-test-tasks.js'

export const runtime = 'nodejs'

// Room for a ~3-min C2 monologue (~450 words ≈ 2.7k chars) without truncation.
const MAX_TRANSCRIPT = 6000

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const PLACEMENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    level: { type: 'STRING', enum: CEFR_LEVELS },
    grammar: { type: 'NUMBER' },
    vocabulary: { type: 'NUMBER' },
    fluency: { type: 'NUMBER' },
    overall: { type: 'NUMBER' },
    strengths: { type: 'ARRAY', items: { type: 'STRING' } },
    improvements: { type: 'ARRAY', items: { type: 'STRING' } },
    feedback: { type: 'STRING' },
  },
  required: ['level', 'grammar', 'vocabulary', 'fluency', 'overall', 'feedback'],
}

function clamp100(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 50
  return Math.max(0, Math.min(100, Math.round(v)))
}

function strList(v, cap) {
  return Array.isArray(v)
    ? v
        .filter((x) => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim().slice(0, 200))
        .slice(0, cap)
    : []
}

function buildPlacementPrompt(uiLang) {
  const fb = uiLang === 'ru' ? 'Russian' : uiLang === 'kk' ? 'Kazakh' : 'English'
  return `You are a calibrated CEFR speaking examiner running a placement test. From the TRANSCRIPT of the candidate's spoken monologue, DETERMINE their CEFR speaking level (A1, A2, B1, B2, C1 or C2) and score three criteria 0–100.

CEFR anchors (spoken production):
- A1: isolated words/phrases, formulaic; can barely sustain speech.
- A2: simple sentences on familiar topics; present tense; frequent hesitation.
- B1: connected speech about experience/plans; narrative tenses; basic linkers (because, so, then).
- B2: clear argument, compare/contrast, abstract topics; comparative structures; good range.
- C1: fluent, well-developed arguments on complex issues; advanced structures; smooth transitions.
- C2: effortless, precise, idiomatic; nuanced; virtually no hesitation or error.

Criteria (0–100): grammar (accuracy & range of structures), vocabulary (range & precision), fluency (flow, coherence, hesitation).

RULES:
- The transcript came from speech-to-text: ignore recognition noise (punctuation, merged words) and judge the LANGUAGE, not the STT quality.
- Be honest and calibrated. A very short or one-word answer ⇒ A1/A2 and low scores, regardless of topic.
- If the candidate spoke partly in another language, judge only the English produced.
- Do NOT judge pronunciation — you cannot hear the audio.

OUTPUT: level (one of A1–C2); grammar, vocabulary, fluency, overall (numbers 0–100); strengths (0–3 short phrases, empty OK); improvements (0–3 short phrases); feedback (2–3 sentences in ${fb}, lead with the level, name one concrete next step). Return ONLY the JSON object.`
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Expected JSON body.' }, { status: 400 })
  }

  const transcript =
    typeof body?.transcript === 'string' ? body.transcript.trim().slice(0, MAX_TRANSCRIPT) : ''
  if (!transcript) {
    return Response.json({ error: 'Empty transcript — nothing to grade.' }, { status: 400 })
  }

  const uiLang = body?.uiLang === 'kk' ? 'kk' : body?.uiLang === 'en' ? 'en' : 'ru'

  if (!hasAnthropicKey()) {
    return Response.json({ error: 'Grader is not configured on the server.' }, { status: 503 })
  }

  let raw
  try {
    raw = await structured({
      systemPrompt: buildPlacementPrompt(uiLang),
      userMessage: `Prompt: ${PLACEMENT_TASK.instruction}\n\nCandidate answer (transcript):\n${transcript}`,
      schema: PLACEMENT_SCHEMA,
    })
  } catch (e) {
    console.error('[speaking-test.assess] placement grading failed', e)
    return Response.json({ error: 'Grading failed. Try again.' }, { status: 502 })
  }

  const detected = CEFR_LEVELS.includes(raw.level) ? raw.level : 'A2'
  const assessment = {
    mode: 'placement',
    level: detected,
    criteria: {
      grammar: clamp100(raw.grammar),
      vocabulary: clamp100(raw.vocabulary),
      fluency: clamp100(raw.fluency),
    },
    overall: clamp100(raw.overall),
    strengths: strList(raw.strengths, 3),
    improvements: strList(raw.improvements, 3),
    feedback:
      typeof raw.feedback === 'string' && raw.feedback.trim()
        ? raw.feedback.trim().slice(0, 700)
        : '',
    transcript,
  }

  return Response.json({ assessment })
}
