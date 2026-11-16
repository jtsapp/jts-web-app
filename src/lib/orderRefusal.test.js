import { describe, it, expect } from 'vitest'
import { orderRefusal } from './orderRefusal.js'
import { sellableOffers } from './sellableOffers.js'

const err = (status, code) => ({ status, code })

describe('orderRefusal', () => {
  it('422 по коду сервера — своя причина, иначе общая', () => {
    expect(orderRefusal(err(422, 'OFFER_UNAVAILABLE'))).toBe('pay.refused.unavailable')
    expect(orderRefusal(err(422, 'LEVEL_REQUIRED'))).toBe('pay.refused.level')
    expect(orderRefusal(err(422, 'SOMETHING_NEW'))).toBe('pay.refused.other')
    expect(orderRefusal(err(422))).toBe('pay.refused.other')
  })
  it('409 — только смена условий', () => {
    expect(orderRefusal(err(409, 'OFFER_VERSION_CHANGED'))).toBe('pay.refused.changed')
    expect(orderRefusal(err(409, 'IDEMPOTENCY_CONFLICT'))).toBeNull()
  })
  it('сеть, 5xx и пустая ошибка — не отказ, а сбой', () => {
    expect(orderRefusal(new Error('Нет связи'))).toBeNull()
    expect(orderRefusal(err(502))).toBeNull()
    expect(orderRefusal(null)).toBeNull()
  })
})

describe('sellableOffers', () => {
  it('убирает только явно непродаваемое; без поля — продаётся (старый бэкенд)', () => {
    const list = [{ code: 'a', purchasable: true }, { code: 'b', purchasable: false }, { code: 'c' }, null]
    expect(sellableOffers(list).map((o) => o.code)).toEqual(['a', 'c'])
    expect(sellableOffers(undefined)).toEqual([])
  })
})
