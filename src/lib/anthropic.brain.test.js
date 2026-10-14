// chatStreamRich(): что уходит в API у голосового мозга. SDK подменён —
// проверяем только тело запроса. 14.10.2026 через шим пошёл Haiku 5.5 (живой
// Декстер на пакете Speaking Buddy): у него нет префилла, а мышление
// выключается только при effort не выше high.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({ calls: [] }))

vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    constructor() {
      this.messages = {
        stream: (body) => {
          sdk.calls.push(body)
          return {
            async *[Symbol.asyncIterator]() {
              yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hi' } }
            },
            finalMessage: async () => ({ usage: {}, stop_reason: 'end_turn' }),
          }
        },
      }
    }
  }
  return { default: Anthropic }
})

import { chatStreamRich } from './anthropic.js'

const run = async (model, messages) => {
  for await (const ev of chatStreamRich({ systemPrompt: 's', messages, model })) void ev
  return sdk.calls.at(-1)
}

const TAIL = [
  { role: 'user', content: 'hello' },
  { role: 'assistant', content: '[angry] Again.' },
]

beforeEach(() => {
  sdk.calls = []
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('chatStreamRich()', () => {
  it('Haiku 5.5: мышление выключено при effort low', async () => {
    const body = await run('claude-haiku-5-5', [{ role: 'user', content: 'hello' }])
    expect(body.thinking).toEqual({ type: 'disabled' })
    expect(body.output_config).toEqual({ effort: 'low' })
  })

  it('Haiku 5.5: хвост на реплике тьютора закрывается репликой ученика «.»', async () => {
    const body = await run('claude-haiku-5-5', TAIL)
    expect(body.messages.at(-1)).toEqual({
      role: 'user',
      content: [{ type: 'text', text: '.', cache_control: { type: 'ephemeral' } }],
    })
    expect(body.messages.at(-2).role).toBe('assistant')
  })

  it('Haiku 4.5: как раньше — префилл держится, effort не шлём (у 4.5 его нет)', async () => {
    const body = await run('claude-haiku-4-5', TAIL)
    expect(body.messages.at(-1).role).toBe('assistant')
    expect(body.output_config).toBeUndefined()
  })
})
