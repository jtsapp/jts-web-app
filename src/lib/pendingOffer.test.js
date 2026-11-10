// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { consumePendingOffer, parseOfferParam, rememberPendingOffer } from './pendingOffer.js'
import { checkoutUrl } from './checkoutOrigin.js'

describe('pendingOffer', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('отдаёт корзину один раз', () => {
    rememberPendingOffer('ind-60-12')
    expect(consumePendingOffer()).toEqual([{ code: 'ind-60-12', qty: 1 }])
    expect(consumePendingOffer()).toEqual([])
  })

  it('несколько позиций с количеством', () => {
    expect(parseOfferParam('ind-60-12:2,group-12')).toEqual([
      { code: 'ind-60-12', qty: 2 },
      { code: 'group-12', qty: 1 },
    ])
  })

  it('чужое из адреса не запоминает, количество в границах', () => {
    rememberPendingOffer('<script>')
    rememberPendingOffer('')
    expect(consumePendingOffer()).toEqual([])
    expect(parseOfferParam('a:0,b:99')).toEqual([{ code: 'a', qty: 1 }, { code: 'b', qty: 20 }])
  })

  it('адрес корзины на домене оплаты читается обратно', () => {
    const url = checkoutUrl('https://justtostudy-english.kz', 'pricing', [{ code: 'ind-60-12', qty: 2 }, { code: 'group-12', qty: 1 }])
    expect(url).toBe('https://justtostudy-english.kz/?screen=pricing&offer=ind-60-12%3A2%2Cgroup-12')
    expect(parseOfferParam(new URL(url).searchParams.get('offer'))).toEqual([
      { code: 'ind-60-12', qty: 2 },
      { code: 'group-12', qty: 1 },
    ])
  })
})
