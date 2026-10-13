// Перевод выделенного в письменном уроке английского фрагмента на ru + kk
// разом (Haiku, дёшево и быстро). Только залогиненным и с дневным лимитом:
// вызов копеечный (~$0.001), но роут без гейта — бесплатный переводчик для
// скриптов, поэтому лимит 100/день на аккаунт — и 20/день демо-аккаунту
// (см. writingBudget.js).

import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import { isRetryableLlmError } from '@/lib/llmRetry.js'
import { TRANSLATE_DEADLINE_MS } from '@/practice/writing/translateTimeouts.js'
import {
  translateBudget,
  translateBudgetPayload,
  consumeTranslate,
  refundTranslate,
} from '@/lib/db/writingBudget.js'

export const runtime = 'nodejs'

// 240 символов ≈ два предложения: ученик переводит фразу из своего текста, а не
// главу. Больший фрагмент — сигнал скрипта, а не урока.
const MAX_CHARS = 240

// Один вызов — не дольше 5 с (обычный перевод 0.8–1.9 с), повтор — только если
// до TRANSLATE_DEADLINE_MS осталось хотя бы 3 с: на меньшем остатке перевод не
// успеет, а ответ, пришедший после ухода клиента, — списанный впустую лимит.
const CALL_TIMEOUT_MS = 5000
const MIN_RETRY_MS = 3000
// Нижняя граница таймаута вызова: 0 (или минус, если вход в бэкенд затянулся)
// structured() читает как «таймаута нет» — и SDK ждал бы свои 10 минут.
const MIN_CALL_MS = 1000

const TRANSLATE_SCHEMA = {
  type: 'OBJECT',
  properties: { ru: { type: 'STRING' }, kk: { type: 'STRING' } },
  required: ['ru', 'kk'],
}

async function safeBudget(profileId, isDemoAccount) {
  try {
    return await translateBudget(profileId, isDemoAccount)
  } catch {
    return null
  }
}

export async function POST(request) {
  // Потолок считается от входа в роут: клиент ждёт 12 с с момента отправки,
  // и проверка токена у бэкенда и списание лимита тоже идут в этот счёт.
  const startedAt = Date.now()
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Expected JSON body.' }, { status: 400 })
  }

  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  // Хоть одна латинская буква: переводим английский фрагмент, а не смайлики
  // и не уже-русский текст — на них Haiku тратить не за что.
  if (!text || text.length > MAX_CHARS || !/[A-Za-z]/.test(text)) {
    return Response.json(
      { error: `Select an English fragment up to ${MAX_CHARS} characters.` },
      { status: 400 },
    )
  }

  if (!hasAnthropicKey()) {
    return Response.json(
      { configured: false, error: 'Translator is not configured on the server.' },
      { status: 503 },
    )
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  const profileId = resolved.id
  // Демо-аккаунту — свой дневной потолок (см. writingBudget.js): 100 переводов
  // в день × 14 дней демо стоят $1.40 при целевой себестоимости всего демо
  // ~$0.57. Флаг приехал тем же /user/me, что и проверка токена.
  const isDemo = resolved.isDemoAccount

  // Списание ДО платного вызова; без БД метрирования нет, сбой БД fail-open —
  // тот же контракт, что у AI-проверки (см. check/route.js).
  let charged = false
  let budget = null
  if (isDbConfigured()) {
    try {
      const after = await consumeTranslate(profileId, isDemo)
      if (after == null) {
        return Response.json(
          { error: 'daily_limit_reached', budget: await safeBudget(profileId, isDemo) },
          { status: 429 },
        )
      }
      charged = true
      budget = translateBudgetPayload(after, isDemo)
    } catch (e) {
      console.error('[writing.translate] budget consume failed', e)
    }
  }

  // Свой цикл вместо ретраев SDK (см. lib/llmRetry.js): повтор — только на
  // сбой сети/перегрузку и только если до TRANSLATE_DEADLINE_MS на него хватает
  // времени. Так роут отвечает раньше, чем клиент уйдёт в подстрочник.
  let raw
  for (let attempt = 1; ; attempt++) {
    const left = TRANSLATE_DEADLINE_MS - (Date.now() - startedAt)
    try {
      raw = await structured({
        systemPrompt:
          'Translate this English fragment (a learner selected it in a writing lesson) into Russian and Kazakh. Natural, concise, the most common learner-relevant sense. No commentary.',
        userMessage: text,
        schema: TRANSLATE_SCHEMA,
        model: 'claude-haiku-4-5-20251001',
        maxOutputTokens: 300,
        timeoutMs: Math.max(MIN_CALL_MS, Math.min(CALL_TIMEOUT_MS, left)),
        maxRetries: 0,
      })
      break
    } catch (e) {
      const leftNow = TRANSLATE_DEADLINE_MS - (Date.now() - startedAt)
      if (attempt < 2 && isRetryableLlmError(e) && leftNow >= MIN_RETRY_MS) {
        console.warn('[writing.translate] failed, retrying', e?.status ?? e?.name)
        continue
      }
      console.error('[writing.translate] failed', e)
      if (charged) {
        try {
          await refundTranslate(profileId)
        } catch (re) {
          console.error('[writing.translate] budget refund failed', re)
        }
      }
      return Response.json({ error: 'Translation failed. Try again.' }, { status: 502 })
    }
  }

  const ru = String(raw?.ru || '').trim().slice(0, 500)
  const kk = String(raw?.kk || '').trim().slice(0, 500)
  return Response.json({ ru, kk, budget })
}
