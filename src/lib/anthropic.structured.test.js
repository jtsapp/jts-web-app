// structured(): что уходит в API со строгой схемой и без неё. SDK подменён —
// проверяем только тело запроса и опции.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({ calls: [] }))

vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    constructor() {
      this.messages = {
        create: async (body, opts) => {
          sdk.calls.push({ body, opts })
          return { content: [{ type: 'tool_use', name: 'record_result', input: { ok: true } }], usage: {} }
        },
      }
    }
  }
  return { default: Anthropic }
})

import { structured } from './anthropic.js'

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { a: { type: 'STRING' } }, required: ['a'] } },
  },
  required: ['summary', 'items'],
}

beforeEach(() => {
  sdk.calls = []
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('structured()', () => {
  it('strict: строгий инструмент, additionalProperties:false на каждом объекте', async () => {
    const out = await structured({ systemPrompt: 's', userMessage: 'u', schema: SCHEMA, model: 'claude-sonnet-5', strict: true })
    expect(out).toEqual({ ok: true })
    const tool = sdk.calls[0].body.tools[0]
    expect(tool.strict).toBe(true)
    expect(tool.input_schema.additionalProperties).toBe(false)
    expect(tool.input_schema.properties.items.items.additionalProperties).toBe(false)
    expect(tool.input_schema.required).toEqual(['summary', 'items'])
    expect(sdk.calls[0].body.tool_choice).toEqual({ type: 'tool', name: 'record_result' })
  })

  it('без strict — прежний запрос байт в байт', async () => {
    await structured({ systemPrompt: 's', userMessage: 'u', schema: SCHEMA, model: 'claude-sonnet-5' })
    const tool = sdk.calls[0].body.tools[0]
    expect('strict' in tool).toBe(false)
    expect('additionalProperties' in tool.input_schema).toBe(false)
  })

  it('timeoutMs и maxRetries доезжают до SDK', async () => {
    await structured({ systemPrompt: 's', userMessage: 'u', schema: SCHEMA, model: 'claude-sonnet-5', timeoutMs: 30000, maxRetries: 0 })
    expect(sdk.calls[0].opts).toEqual({ timeout: 30000, maxRetries: 0 })
  })
})
