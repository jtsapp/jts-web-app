// Перевод выделенного в письменном уроке английского фрагмента на ru + kk
// разом (Haiku, дёшево и быстро). Только залогиненным и с дневным лимитом:
// вызов копеечный (~$0.001), но роут без гейта — бесплатный переводчик для
// скриптов, поэтому лимит 100/день на аккаунт (см. writingBudget.js).

import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import {
  DAILY_TRANSLATE_LIMIT,
  nextDayResetAt,
  translateBudget,
  consumeTranslate,
  refundTranslate,
} from '@/lib/db/writingBudget.js'

export const runtime = 'nodejs'

// 240 символов ≈ два предложения: ученик переводит фразу из своего текста, а не
// главу. Больший фрагмент — сигнал скрипта, а не урока.
const MAX_CHARS = 240

const TRANSLATE_SCHEMA = {
  type: 'OBJECT',
  properties: { ru: { type: 'STRING' }, kk: { type: 'STRING' } },
  required: ['ru', 'kk'],
}

// Дневной бюджет для ответа клиенту по свежему used из consume. null — без БД.
function budgetFromUsed(used) {
  if (used == null) return null
  return {
    limit: DAILY_TRANSLATE_LIMIT,
    used,
    remaining: Math.max(0, DAILY_TRANSLATE_LIMIT - used),
    resetsAt: nextDayResetAt(new Date()),
  }
}

async function safeBudget(profileId) {
  try {
    return await translateBudget(profileId)
  } catch {
    return null
  }
}

export async function POST(request) {
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

  // Списание ДО платного вызова; без БД метрирования нет, сбой БД fail-open —
  // тот же контракт, что у AI-проверки (см. check/route.js).
  let charged = false
  let budget = null
  if (isDbConfigured()) {
    try {
      const after = await consumeTranslate(profileId)
      if (after == null) {
        return Response.json(
          { error: 'daily_limit_reached', budget: await safeBudget(profileId) },
          { status: 429 },
        )
      }
      charged = true
      budget = budgetFromUsed(after)
    } catch (e) {
      console.error('[writing.translate] budget consume failed', e)
    }
  }

  let raw
  try {
    raw = await structured({
      systemPrompt:
        'Translate this English fragment (a learner selected it in a writing lesson) into Russian and Kazakh. Natural, concise, the most common learner-relevant sense. No commentary.',
      userMessage: text,
      schema: TRANSLATE_SCHEMA,
      model: 'claude-haiku-4-5-20251001',
      maxOutputTokens: 300,
      timeoutMs: 10000,
    })
  } catch (e) {
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

  const ru = String(raw?.ru || '').trim().slice(0, 500)
  const kk = String(raw?.kk || '').trim().slice(0, 500)
  return Response.json({ ru, kk, budget })
}
