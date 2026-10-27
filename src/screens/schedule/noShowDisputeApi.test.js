import { describe, it, expect, vi, afterEach } from 'vitest'
import { disputeNoShow, getMyNoShowDisputes } from '../../api.js'

describe('API оспаривания пропуска', () => {
  afterEach(() => vi.restoreAllMocks())

  it('ученик читает свои оспаривания и подаёт новое с причиной', async () => {
    const fetch = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ disputable: [], items: [] })))
    await getMyNoShowDisputes('tok')
    expect(fetch.mock.calls[0][0]).toMatch(/\/cabinet\/no-show-disputes\/mine$/)
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')

    fetch.mockResolvedValue(new Response(JSON.stringify({ id: 1 })))
    await disputeNoShow('tok', 7, 'Я был на уроке')
    const [url, init] = fetch.mock.calls[1]
    expect(url).toMatch(/\/cabinet\/no-show-disputes\/mine\/lessons\/7$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ reason: 'Я был на уроке' })
  })
})
