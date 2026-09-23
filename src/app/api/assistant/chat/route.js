// Помощник по сайту ученика: вопрос + снимок экрана → потоковый ответ модели.
//
// Роут только пропускает и стримит: кто спрашивает (токен ученика), не
// превышен ли лимит, валиден ли запрос. ЧТО увидит модель — в
// lib/assistant/prompt.js, база знаний — в lib/assistant/knowledge.js.
//
// Ответ — обычный текст кусками (text/plain), а не SSE: у виджета один
// потребитель, и разбирать события ему незачем.
//
// Вопросы не по теме. Модель отвечает на них меткой OFFTOPIC_MARKER. Поэтому
// ответ клиенту начинается не сразу, а после первых токенов: как только ясно,
// метка это или нет. Метка → генерация обрывается, клиент получает короткий
// стандартный отказ с заголовком x-assistant-offtopic, основной лимит
// ученика возвращается, а вопрос идёт в отдельный счётчик (rateLimit.js).
// Задержки это не добавляет: первые токены клиент ждал бы и так.

import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { chatStreamRich, hasAnthropicKey } from '@/lib/anthropic.js'
import {
  AssistantRequestError,
  OFFTOPIC_REPLY,
  buildSystemPrompt,
  buildTurns,
  classifyStart,
  parseChatRequest,
} from '@/lib/assistant/prompt.js'
import { createOfftopicGuard, createRateLimiter } from '@/lib/assistant/rateLimit.js'

export const runtime = 'nodejs'

// Haiku: ответ справки должен начаться за секунду, а разбор школьного
// задания ему по силам. Для эксперимента с моделью посильнее — ASSISTANT_MODEL.
const MODEL = process.env.ASSISTANT_MODEL || 'claude-haiku-4-5-20251001'
const MAX_OUTPUT_TOKENS = 800

const takeQuota = createRateLimiter()
const offtopic = createOfftopicGuard()

const json = (status, body, headers = {}) =>
  Response.json(body, { status, headers })

const TEXT_HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  // nginx перед приложением иначе копит весь ответ и отдаёт его разом —
  // та же грабля, что у голосового мозга (см. voice/brain/chat/completions).
  'x-accel-buffering': 'no',
}

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

  const key = `user-${auth.user.userId}`
  const pause = offtopic.blockedFor(key)
  if (pause > 0) {
    return json(429, { error: 'offtopic_cooldown', retryAfterSec: pause }, { 'retry-after': String(pause) })
  }
  const quota = takeQuota(key)
  if (!quota.ok) {
    return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, {
      'retry-after': String(quota.retryAfterSec),
    })
  }

  const gen = chatStreamRich({
    systemPrompt: buildSystemPrompt(),
    messages: buildTurns({ ...parsed, user: auth.user }),
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    task: 'site_assistant',
  })

  // Читаем, пока не станет ясно, метка это или ответ.
  let head = ''
  let verdict = 'undecided'
  let finished = false
  try {
    while (verdict === 'undecided') {
      const { value, done } = await gen.next()
      if (done) {
        finished = true
        break
      }
      if (value.type === 'text' && value.text) {
        head += value.text
        verdict = classifyStart(head)
      }
    }
  } catch (err) {
    console.error('[assistant] model failed:', err?.message || err)
    // Ответа не было — и вопрос не должен съесть лимит ученика.
    takeQuota.refund(key)
    return json(502, { error: 'model_failed' })
  }

  // Модель закончила на обрывке метки («[[OFF») — ответа по теме тут нет.
  if (finished && verdict === 'undecided' && head.trim()) verdict = 'offtopic'

  if (verdict === 'offtopic') {
    // return() закрывает стрим SDK — модель перестаёт генерировать и тарифицироваться.
    await gen.return?.().catch(() => {})
    takeQuota.refund(key)
    offtopic.record(key)
    return new Response(OFFTOPIC_REPLY[parsed.lang] || OFFTOPIC_REPLY.ru, {
      status: 200,
      headers: { ...TEXT_HEADERS, 'x-assistant-offtopic': '1' },
    })
  }

  if (finished && !head.trim()) {
    takeQuota.refund(key)
    return json(502, { error: 'model_empty' })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(head))
      if (finished) {
        controller.close()
        return
      }
      try {
        for await (const ev of gen) {
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
    cancel() {
      // Ученик закрыл окно или начал новый чат — дальше генерировать незачем.
      gen.return?.().catch(() => {})
    },
  })

  return new Response(stream, { status: 200, headers: TEXT_HEADERS })
}
