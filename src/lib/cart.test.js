import { describe, it, expect } from 'vitest'
import { addItem, cartCount, cartTotal, hasItem, qtyOf, removeItem, setQty } from './cart.js'

const IND = { id: 'ind-60-12', kind: 'ind', title: 'Индивидуальный', subtitle: '12 уроков', price: 84000 }
const GROUP = { id: 'group-12', kind: 'group', title: 'Групповой курс', subtitle: '12 уроков', price: 29990 }

describe('корзина тарифов', () => {
  it('добавление и повторное добавление того же пакета', () => {
    let items = addItem([], IND)
    expect(qtyOf(items, IND.id)).toBe(1)
    items = addItem(items, IND)
    expect(qtyOf(items, IND.id)).toBe(2)
    expect(cartCount(items)).toBe(1)
  })

  it('исходный массив не меняется', () => {
    const before = [{ ...IND, qty: 1 }]
    addItem(before, GROUP)
    setQty(before, IND.id, 5)
    removeItem(before, IND.id)
    expect(before).toHaveLength(1)
    expect(before[0].qty).toBe(1)
  })

  // Итог из макета: 84 000 (12 индивидуальных) + 29 990 (групповой) = 113 990.
  it('итог считается по количеству', () => {
    const items = addItem(addItem([], IND), GROUP)
    expect(cartTotal(items)).toBe(113990)
    expect(cartCount(items)).toBe(2)
    expect(cartTotal(setQty(items, IND.id, 2))).toBe(84000 * 2 + 29990)
  })

  it('количество 0 убирает строку целиком', () => {
    const items = addItem([], IND)
    expect(setQty(items, IND.id, 0)).toEqual([])
    expect(setQty(items, IND.id, -3)).toEqual([])
    expect(hasItem(setQty(items, IND.id, 0), IND.id)).toBe(false)
  })

  it('пустая корзина — ноль, а не NaN', () => {
    expect(cartTotal([])).toBe(0)
    expect(cartCount([])).toBe(0)
    expect(qtyOf([], IND.id)).toBe(0)
  })
})
