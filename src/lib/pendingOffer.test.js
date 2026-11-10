// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { consumePendingOffer, rememberPendingOffer } from './pendingOffer.js'

describe('pendingOffer', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('отдаёт код один раз', () => {
    rememberPendingOffer('ind-60-12')
    expect(consumePendingOffer()).toBe('ind-60-12')
    expect(consumePendingOffer()).toBeNull()
  })

  it('чужое из адреса не запоминает', () => {
    rememberPendingOffer('<script>')
    rememberPendingOffer('')
    expect(consumePendingOffer()).toBeNull()
  })
})
