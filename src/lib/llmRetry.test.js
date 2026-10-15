import { describe, expect, it } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { isRetryableLlmError } from './llmRetry.js'

const api = (Cls, status) => new Cls(status, { type: 'error' }, 'x', new Headers())

describe('isRetryableLlmError', () => {
  it('сеть, таймаут, перегрузка и лимит — повторять', () => {
    expect(isRetryableLlmError(new Anthropic.APIConnectionError({ message: 'reset' }))).toBe(true)
    expect(isRetryableLlmError(new Anthropic.APIConnectionTimeoutError())).toBe(true)
    expect(isRetryableLlmError(api(Anthropic.InternalServerError, 529))).toBe(true)
    expect(isRetryableLlmError(api(Anthropic.InternalServerError, 500))).toBe(true)
    expect(isRetryableLlmError(api(Anthropic.RateLimitError, 429))).toBe(true)
  })

  it('ошибка запроса, ключа и отмена — не повторять', () => {
    expect(isRetryableLlmError(api(Anthropic.BadRequestError, 400))).toBe(false)
    expect(isRetryableLlmError(api(Anthropic.AuthenticationError, 401))).toBe(false)
    expect(isRetryableLlmError(new Anthropic.APIUserAbortError())).toBe(false)
    expect(isRetryableLlmError(new Error('Claude returned no tool_use block'))).toBe(false)
    expect(isRetryableLlmError(null)).toBe(false)
  })
})
