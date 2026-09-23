// Помощник по сайту ученика: вопрос + снимок экрана → потоковый ответ модели.
//
// Роут только пропускает и стримит: кто спрашивает (токен ученика), не
// превышен ли лимит, валиден ли запрос. ЧТО увидит модель — в
// lib/assistant/prompt.js, база знаний — в lib/assistant/knowledge.js.
//
// Ответ — обычный текст кусками (text/plain), а не SSE: у виджета один
// потребитель, и разбирать события ему незачем.

import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { chatStreamRich, hasAnthropicKey } from '@/lib/anthropic.js'
import {
  AssistantRequestError,
  buildSystemPrompt,
  buildTurns,
  parseChatRequest,
} from '@/lib/assistant/prompt.js'
import { createRateLimiter } from '@/lib/assistant/rateLimit.js'

export const runtime = 'nodejs'

// Haiku: ответ справки должен начаться за секунду, а разбор школьного
// задания ему по силам. Для эксперимента с моделью посильнее — ASSISTANT_MODEL.
const MODEL = process.env.ASSISTANT_MODEL || 'claude-haiku-4-5-20251001'
const MAX_OUTPUT_TOKENS = 800

const takeQuota = createRateLimiter()

const json = (status, body, headers = {}) =>
  Response.json(body, { status, headers })

export async function POST(request) {
  const auth = await verifyTokenStatus(bearerFromRequest(request))
  if (auth.status === 'unavailable') return json(503, { error: 'backend_unavailable' })
  if (auth.status !== 'ok') return json(401, { error: 'unauthorized' })
  if (!hasAnthropicKey()) return json(503, { error: 'assistant_unavailable' })

  let parsed
  try {
    parsed = parseChatRequest(await request.json())
  } catch (err) {
    if (err instanceof AssistantRequestError || err instanceof SyntaxError) {
      return json(400, { error: 'bad_request' })
    }
    throw err
  }

  const quota = takeQuota(`user-${auth.user.userId}`)
  if (!quota.ok) {
    return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, {
      'retry-after': String(quota.retryAfterSec),
    })
  }

  const turns = buildTurns({ ...parsed, user: auth.user })
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of chatStreamRich({
          systemPrompt: buildSystemPrompt(),
          messages: turns,
          model: MODEL,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          task: 'site_assistant',
        })) {
          if (ev.type === 'text' && ev.text) controller.enqueue(encoder.encode(ev.text))
        }
        controller.close()
      } catch (err) {
        console.error('[assistant] stream failed:', err?.message || err)
        // Обрыв посреди ответа клиент видит как ошибку чтения и показывает
        // «не удалось ответить», а не полуфразу как готовый ответ.
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      // nginx перед приложением иначе копит весь ответ и отдаёт его разом —
      // та же грабля, что у голосового мозга (см. voice/brain/chat/completions).
      'x-accel-buffering': 'no',
    },
  })
}
