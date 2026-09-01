// AI-проверка письменной работы (раздел Writing): текст + жанр/уровень →
// оценки 0–5 по четырём осям, verbatim-разборы и rewrite на полуровень выше.
//
// Sonnet (дефолт structured()) — той же ценовой лиги, что IELTS-грейдинг, поэтому
// проверка только для залогиненных и с недельным лимитом (writingBudget).
// Списываем ДО платного вызова, при сбое/невалидном ответе возвращаем кредит.
// Без ключа Anthropic здесь НЕТ mock-ответа намеренно: клиент по 503 сам
// падает в локальную проверку по правилам (localAssess), и рисовать поверх неё
// серверную заглушку было бы двойной работой с худшим результатом.

import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import { validateCheckRequest, validateAssessment } from '@/practice/writing/assessContract.js'
import {
  checkBudget,
  checkBudgetPayload,
  consumeCheck,
  refundCheck,
} from '@/lib/db/writingBudget.js'
import { recordWritingAttempt, updateWritingSnapshot } from '@/lib/db/writingAttempts.js'

export const runtime = 'nodejs'

// Человекочитаемый ярлык уровня для промпта: внутренние id совпадают с CEFR,
// кроме a2p — модели надо говорить «A2+», иначе она примет «A2P» за опечатку.
const LEVEL_TAG = { A1: 'A1', A2: 'A2', A2P: 'A2+', B1: 'B1', B2: 'B2', C1: 'C1' }

const CORRECTION_TYPES = ['grammar', 'vocabulary', 'register', 'cohesion', 'spelling']
const SEVERITIES = ['high', 'medium', 'low']

const CHECK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    scores: {
      type: 'OBJECT',
      properties: {
        task: { type: 'NUMBER' },
        organisation: { type: 'NUMBER' },
        vocabulary: { type: 'NUMBER' },
        grammar: { type: 'NUMBER' },
      },
      required: ['task', 'organisation', 'vocabulary', 'grammar'],
    },
    cefr: { type: 'STRING', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
    summary: { type: 'STRING' },
    strengths: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { quote: { type: 'STRING' }, why: { type: 'STRING' } },
        required: ['quote', 'why'],
      },
    },
    corrections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          original: { type: 'STRING' },
          corrected: { type: 'STRING' },
          type: { type: 'STRING', enum: CORRECTION_TYPES },
          severity: { type: 'STRING', enum: SEVERITIES },
          explanation: { type: 'STRING' },
        },
        required: ['original', 'corrected', 'type', 'severity', 'explanation'],
      },
    },
    rewrite: { type: 'STRING' },
    nextSteps: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['scores', 'cefr', 'summary', 'strengths', 'corrections', 'rewrite', 'nextSteps'],
}

// Бюджет для тела ошибки 429: показать сколько есть, даже если select упал.
// isDemoAccount — тот же, по которому списывали: клиент должен видеть СВОЙ
// потолок, «осталось 0 из 10» на демо-аккаунте с лимитом 3 — это баг.
async function safeBudget(profileId, isDemoAccount) {
  try {
    return await checkBudget(profileId, isDemoAccount)
  } catch {
    return null
  }
}

function buildCheckPrompt({ levelTag, genre, task, targetWords }) {
  const range =
    Array.isArray(targetWords) && targetWords.length === 2
      ? `${targetWords[0]}–${targetWords[1]} words`
      : 'not fixed'
  return `You are a CEFR-calibrated writing examiner for teenage English learners in Kazakhstan. Their first language is Russian or Kazakh, so expect L1 calques ("I am agree", "informations", "very like"), missing articles and literal translations — treat these as ordinary, diagnosable learner errors, never as carelessness.

The learner's declared level is ${levelTag}. Genre: ${genre}. Task: ${task}. Target length: ${range}. Score the four criteria — task, organisation, vocabulary, grammar — from 0 to 5 in half steps (0, 0.5, 1 … 5), judged AGAINST the declared level: a solid ${levelTag} performance earns 4–5 even where it would look weak a level higher. Separately report the CEFR level (cefr) the text actually demonstrates.

strengths: 2–4 items. Each "quote" MUST be a verbatim substring of the learner's text, copied character for character — the server drops any quote it cannot find in the text. In "why", one sentence on what this fragment does well.

corrections: up to 12 items, most damaging first. Each "original" MUST appear verbatim in the learner's text — the server drops corrections it cannot locate. Give the corrected form, a type (grammar, vocabulary, register, cohesion or spelling), a severity (high, medium or low), and a one-sentence explanation of the rule or the L1 calque behind the error.

rewrite: the learner's OWN text improved by about half a CEFR level — same content, same order of ideas, roughly the same length. It must still sound like this learner on a good day, NOT a model answer or a native-speaker showcase.

nextSteps: up to 3 imperative, concrete actions the learner can apply in their very next text (e.g. "Join two short sentences with 'because' at least twice"), never vague advice like "improve grammar".

summary: 2–3 sentences — the overall impression and the single most important thing to fix first.

Write every text field in simple English and address the learner directly as "you". Return ONLY the tool call with the JSON result.`
}

// Статус для клиента: настроена ли AI-проверка и остаток недельного бюджета.
// Тоже только с Bearer: бюджет — атрибут аккаунта, гостю показывать нечего.
export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  let budget = null
  try {
    budget = await checkBudget(resolved.id, resolved.isDemoAccount)
  } catch (e) {
    console.error('[writing.check] budget status failed', e)
  }
  return Response.json({ configured: hasAnthropicKey(), budget })
}

export async function POST(request) {
  // Только залогиненные: вызов платный, лимит считаем на аккаунт. Гостю клиент
  // и не показывает AI-проверку — у него остаётся локальная по правилам.
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Expected JSON body.' }, { status: 400 })
  }

  const parsed = validateCheckRequest(body)
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 })
  }
  const value = parsed.value

  if (!hasAnthropicKey()) {
    // Без mock: клиент по configured:false сам уходит в localAssess.
    return Response.json(
      { configured: false, error: 'AI check is not configured on the server.' },
      { status: 503 },
    )
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  const profileId = resolved.id
  // Демо-статус приехал тем же /user/me, которым проверялся токен (см.
  // resolveProfileId) — лишнего похода на бэкенд ради потолка нет. Один и тот
  // же флаг решает и списание, и цифру в ответе: разъедься они, клиент увидел
  // бы один потолок, а списание отсекало бы по другому.
  const isDemo = resolved.isDemoAccount

  // Списание ДО платного вызова — гонка двух запросов не пробьёт недельный
  // потолок. Без БД (dev/preview) метрирования нет — мягкая деградация, как в
  // shadowing. Сбой БД не роняет проверку (fail-open): разовый вызов дёшев.
  let charged = false
  let budget = null
  if (isDbConfigured()) {
    try {
      const after = await consumeCheck(profileId, isDemo)
      if (after == null) {
        return Response.json(
          { error: 'weekly_limit_reached', budget: await safeBudget(profileId, isDemo) },
          { status: 429 },
        )
      }
      charged = true
      budget = checkBudgetPayload(after, isDemo)
    } catch (e) {
      console.error('[writing.check] budget consume failed', e)
    }
  }

  const levelTag = LEVEL_TAG[String(value.level || '').toUpperCase()] || String(value.level || 'B1')

  let raw
  try {
    raw = await structured({
      systemPrompt: buildCheckPrompt({
        levelTag,
        genre: value.genre,
        task: value.task,
        targetWords: value.targetWords,
      }),
      userMessage: value.text,
      schema: CHECK_SCHEMA,
      maxOutputTokens: 3500,
      timeoutMs: 60000,
    })
  } catch (e) {
    console.error('[writing.check] grading failed', e)
    if (charged) {
      try {
        await refundCheck(profileId)
      } catch (re) {
        console.error('[writing.check] budget refund failed', re)
      }
    }
    return Response.json({ error: 'Grading failed. Try again.' }, { status: 502 })
  }

  // Нормализация против текста ученика (verbatim-цитаты и пр.) — общий контракт
  // с клиентом. Невалидный ответ = проверка не состоялась: кредит возвращаем.
  const validated = validateAssessment(raw, value.text)
  if (!validated) {
    console.error('[writing.check] model returned an invalid assessment shape')
    if (charged) {
      try {
        await refundCheck(profileId)
      } catch (re) {
        console.error('[writing.check] budget refund failed', re)
      }
    }
    return Response.json({ error: 'Grading failed. Try again.' }, { status: 502 })
  }

  // Best-effort персистентность: оценка уже оплачена, ответ ученику важнее
  // журнала. Модули сами глотают свои ошибки, try — на случай неожиданного.
  try {
    await recordWritingAttempt({
      profileId,
      level: value.level ?? null,
      genre: value.genre ?? null,
      wordCount: validated.wordCount ?? null,
      essay: value.text,
      assessment: validated,
      mode: 'live',
    })
    await updateWritingSnapshot(profileId, validated)
  } catch (e) {
    console.error('[writing.check] persist failed (non-fatal)', e)
  }

  return Response.json({ assessment: { ...validated, mode: 'live' }, mode: 'live', budget })
}
