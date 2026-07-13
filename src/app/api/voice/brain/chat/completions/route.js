// Voice brain — OpenAI-compatible chat-completions shim over Anthropic Haiku.
// Next.js App Router route handler with streamed SSE (ReadableStream + Response).
//
// The LiveKit cascade agent points livekit-plugins-openai at
// `${JTS_API_URL}/api/voice/brain`; that plugin POSTs to `<base_url>/chat/
// completions` — this route. We translate the OpenAI request into an Anthropic
// call (Haiku 4.5 + prompt caching) and stream the reply back as OpenAI SSE.

import { chatStreamRich, hasAnthropicKey } from '@/lib/anthropic.js'

export const runtime = 'nodejs'

function toRichConversation(messages) {
  let systemPrompt = ''
  const turns = []
  for (const m of messages) {
    const content = typeof m.content === 'string' ? m.content : ''
    if (m.role === 'system') {
      systemPrompt = systemPrompt ? `${systemPrompt}\n\n${content}` : content
    } else if (m.role === 'user') {
      turns.push({ role: 'user', content })
    } else if (m.role === 'assistant') {
      const toolCalls = (m.tool_calls ?? [])
        .filter((tc) => tc.function?.name)
        .map((tc, i) => ({
          id: tc.id || `call_${i}`,
          name: tc.function.name,
          argumentsJson: tc.function.arguments || '{}',
        }))
      turns.push({ role: 'assistant', content, ...(toolCalls.length > 0 ? { toolCalls } : {}) })
    } else if (m.role === 'tool') {
      turns.push({ role: 'tool', toolCallId: m.tool_call_id || '', content: content || 'ok' })
    }
  }
  return { systemPrompt, turns }
}

function toToolDefs(tools) {
  if (!Array.isArray(tools)) return []
  return tools
    .filter((t) => t.function?.name)
    .map((t) => ({
      name: t.function.name,
      description: t.function.description,
      inputSchema: t.function.parameters ?? { type: 'object', properties: {} },
    }))
}

function sseChunk(id, model, created, delta, finishReason) {
  const payload = {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  }
  return `data: ${JSON.stringify(payload)}\n\n`
}

export async function POST(request) {
  let body = {}
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  const { systemPrompt, turns } = toRichConversation(messages)
  const tools = toToolDefs(body.tools)

  const kickoff = '(Begin the conversation now — greet the learner.)'
  if (!turns.some((t) => t.role !== 'assistant')) {
    turns.push({ role: 'user', content: kickoff })
  }

  const lastUserTurn = [...turns].reverse().find((t) => t.role === 'user')
  const blankUserTurn =
    lastUserTurn !== undefined && !/[\p{L}\p{N}]/u.test(lastUserTurn.content)

  const model = body.model || 'jts-voice-router'
  const created = Math.floor(Date.now() / 1000)
  const id = `chatcmpl-${created}-${Math.random().toString(36).slice(2, 10)}`
  const temperature = typeof body.temperature === 'number' ? body.temperature : undefined

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (s) => controller.enqueue(encoder.encode(s))
      try {
        send(sseChunk(id, model, created, { role: 'assistant' }, null))

        if (blankUserTurn) {
          send(sseChunk(id, model, created, {}, 'stop'))
          send('data: [DONE]\n\n')
          return
        }

        if (!hasAnthropicKey()) {
          send(
            sseChunk(
              id,
              model,
              created,
              { content: "Sorry, the tutor is briefly unavailable. Let's try again in a moment." },
              null,
            ),
          )
          send(sseChunk(id, model, created, {}, 'stop'))
          send('data: [DONE]\n\n')
          return
        }

        let anyText = false
        let toolCallIndex = 0
        for await (const ev of chatStreamRich({ systemPrompt, messages: turns, tools, temperature })) {
          if (ev.type === 'text') {
            if (!ev.text) continue
            anyText = true
            send(sseChunk(id, model, created, { content: ev.text }, null))
          } else {
            send(
              sseChunk(
                id,
                model,
                created,
                {
                  tool_calls: [
                    {
                      index: toolCallIndex++,
                      id: ev.toolCall.id,
                      type: 'function',
                      function: { name: ev.toolCall.name, arguments: ev.toolCall.argumentsJson },
                    },
                  ],
                },
                null,
              ),
            )
          }
        }

        if (toolCallIndex > 0) {
          send(sseChunk(id, model, created, {}, 'tool_calls'))
        } else {
          if (!anyText) {
            send(sseChunk(id, model, created, { content: 'Sorry, could you say that again?' }, null))
          }
          send(sseChunk(id, model, created, {}, 'stop'))
        }
        send('data: [DONE]\n\n')
      } catch (err) {
        console.error('[voice.brain] stream error', err)
        send(
          sseChunk(
            id,
            model,
            created,
            { content: 'Sorry, I lost my train of thought — could you repeat that?' },
            null,
          ),
        )
        send(sseChunk(id, model, created, {}, 'stop'))
        send('data: [DONE]\n\n')
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    },
  })
}
