import { describe, it, expect, vi, beforeEach } from 'vitest'

const { loadToken } = vi.hoisted(() => ({ loadToken: vi.fn() }))
vi.mock('./session.js', () => ({ loadToken }))

import { stompConnectHeaders } from './stompAuth.js'

describe('stompConnectHeaders', () => {
  beforeEach(() => {
    loadToken.mockReset()
  })

  it('берёт свежий токен из storage, а не протухший prop', () => {
    loadToken.mockReturnValue('FRESH')
    expect(stompConnectHeaders('STALE')).toEqual({ Authorization: 'Bearer FRESH' })
  })

  it('без storage остаётся на токене из пропа', () => {
    loadToken.mockReturnValue(null)
    expect(stompConnectHeaders('TOK')).toEqual({ Authorization: 'Bearer TOK' })
  })
})
