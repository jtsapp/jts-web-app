// ИИ-разбор раунда «Аркады» (Speak or Die): стенограмма раунда → Sonnet →
// тренировочный разбор по трём критериям IELTS Speaking. Порт бэкенда javaTest
// (SpeakingAnalysisService); промпт, схема и проверка ответа — в общем
// контракте src/practice/arcade/reviewContract.js.
//
// Вызов платный, поэтому порядок как у разбора «Ситуаций»:
//   1. отсечь мусор (кривое тело, меньше 20 слов) — БЕСПЛАТНО и до всего;
//   2. списать разбор из дневного лимита (lib/db/arcadeBudget.js) — ДО вызова,
//      иначе потолок не держится при гонке;
//   3. вызвать модель; сбой или ответ не той формы — вернуть разбор в бюджет.
//
// Звук сюда не приходит вовсе — только текст, распознанный браузером, и лента
// пауз. Гостю разбор не положен (по device-id лимит обходится рестартом
// браузера); стенограмму он видит — она целиком клиентская.

import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import { budgetPayload, consume, dayKey, getUsed, refund } from '@/lib/db/arcadeBudget.js'
import {
  REVIEW_SCHEMA,
  REVIEW_SYSTEM,
  buildReviewMessage,
  describeShape,
  normaliseReview,
  validateReviewRequest,
} from '@/practice/arcade/reviewContract.js'

export const runtime = 'nodejs'

// Прод стоит за Cloudflare, который рвёт молчащий запрос через 100 с: один
// вызов не дольше 45 с, оба вместе — не дольше 90, а на повтор идём, только
// если на него осталось хотя бы 30 с.
const CALL_TIMEOUT_MS = 45000
const TOTAL_BUDGET_MS = 90000
const MIN_RETRY_MS = 30000
// ARCADE_REVIEW_DEBUG=1 — писать в лог и сырой ответ модели (для разбора).
const DEBUG = /^(1|true|yes)$/i.test(String(process.env.ARCADE_REVIEW_DEBUG || '').replace(/^﻿/, '').trim())

// Та же модель, что у остальных грейдеров (structured() по умолчанию), но
// названа явно: её имя уходит в подпись под разбором.
const MODEL = String(process.env.ANTHROPIC_MODEL || 'claude-sonnet-5').replace(/^﻿/, '').trim()

// Статус для клиента: настроен ли разбор и остаток на сегодня. Гостю и без БД
// budget = null — клиент просто не рисует счётчик.
export async function GET(request) {
  const base = { configured: hasAnthropicKey() }
  if (unauthorizedIfNoBearer(request) || !isDbConfigured()) return Response.json({ ...base, budget: null })
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  try {
    const used = await getUsed(resolved.id, dayKey(new Date()))
    return Response.json({ ...base, budget: budgetPayload(used, resolved.isDemoAccount) })
  } catch (e) {
    console.error('[arcade.review] budget status failed', e)
    return Response.json({ ...base, budget: null })
  }
}

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  const parsed = validateReviewRequest(body)
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status })
  if (!hasAnthropicKey()) return Response.json({ error: 'not_configured' }, { status: 503 })

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  const profileId = resolved.id
  const isDemo = resolved.isDemoAccount
  const today = dayKey(new Date())

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
        return Response.json({ error: 'daily_limit_reached', budget: budgetPayload(used, isDemo) }, { status: 429 })
      }
      charged = true
      usedNow = after
    } catch (e) {
      // Сбой БД не роняет разбор (fail-open, как в «Ситуациях»): вызов один и
      // короткий, риск перерасхода мал.
      console.error('[arcade.review] budget consume failed', e)
    }
  }

  const giveBack = async () => {
    if (!charged) return
    try {
      await refund(profileId, today)
      usedNow = usedNow == null ? null : Math.max(0, usedNow - 1)
      charged = false
    } catch (e) {
      console.error('[arcade.review] budget refund failed', e)
    }
  }

  // Ответ, из которого нечего показать, — ещё одна попытка, если по времени
  // успеваем уложиться до 100 с Cloudflare. Попытка ученика списана один раз.
  const startedAt = Date.now()
  for (let attempt = 1; ; attempt++) {
    let raw
    try {
      raw = await structured({
        systemPrompt: REVIEW_SYSTEM,
        userMessage: buildReviewMessage(parsed.value),
        schema: REVIEW_SCHEMA,
        model: MODEL,
        maxOutputTokens: 3000,
        timeoutMs: Math.min(CALL_TIMEOUT_MS, TOTAL_BUDGET_MS - (Date.now() - startedAt)),
      })
    } catch (e) {
      await giveBack()
      const timeout = /timeout|timed out/i.test(`${e?.name} ${e?.message}`)
      // Причина — только имя ошибки, без текста ученика.
      console.error('[arcade.review] model call failed', e?.name || 'Error')
      return Response.json({ error: timeout ? 'timeout' : 'review_failed' }, { status: timeout ? 504 : 502 })
    }

    const { review, repairs, problem } = normaliseReview(raw, parsed.value, MODEL)
    if (review) {
      // Починенный ответ — рабочий, но в лог: по нему видно, в чём модель
      // расходится со схемой.
      if (repairs.length) logReply('warn', `repaired reply (attempt ${attempt})`, raw, repairs)
      return Response.json({ review, budget: budgetPayload(usedNow, isDemo) })
    }
    logReply('error', `unusable reply (attempt ${attempt}): ${problem}`, raw, repairs)
    const left = TOTAL_BUDGET_MS - (Date.now() - startedAt)
    if (attempt >= 2 || left < MIN_RETRY_MS) {
      await giveBack()
      return Response.json({ error: 'review_failed' }, { status: 502 })
    }
  }
}

// Одна строка JSON на ответ — её удобно искать в логе стенда
// (kind: arcade_review_reply). Текста модели в ней нет — только форма ответа
// и список починок. Сырой ответ целиком — только с ARCADE_REVIEW_DEBUG=1: в
// нём разбор речи ученика, и в обычный лог ему незачем.
function logReply(level, message, raw, repairs) {
  const line = {
    kind: 'arcade_review_reply',
    message,
    repairs,
    shape: describeShape(raw),
  }
  if (DEBUG) {
    let text
    try {
      text = typeof raw === 'string' ? raw : JSON.stringify(raw)
    } catch {
      text = String(raw)
    }
    line.raw = text.length > 12000 ? `${text.slice(0, 12000)}…` : text
  }
  console[level](`[arcade.review] ${JSON.stringify(line)}`)
}
