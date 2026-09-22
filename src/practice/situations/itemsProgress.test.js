// @vitest-environment jsdom
// Прогресс по сценариям. Важна изоляция от ключа уровней: на нём висит квота
// PRACTICE_SITUATIONS, и запись сценария не должна её трогать.

import { describe, it, expect, beforeEach } from 'vitest'
import { SITUATIONS_ITEMS_KEY, SITUATIONS_KEY } from '../practiceKeys.js'
import { countDone, markItemDone, readDoneItems } from './itemsProgress.js'

describe('itemsProgress', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('пустой стейт — пустой список', () => {
    expect(readDoneItems('a1')).toEqual([])
    expect(countDone('a1')).toBe(0)
  })

  it('отмечает сценарий и держит порядок', () => {
    markItemDone('a1', 3)
    markItemDone('a1', 1)
    expect(readDoneItems('a1')).toEqual([1, 3])
  })

  it('повторная отметка ничего не меняет', () => {
    markItemDone('a1', 2)
    markItemDone('a1', 2)
    expect(readDoneItems('a1')).toEqual([2])
  })

  it('уровни не смешиваются: номера сценариев у всех начинаются с единицы', () => {
    markItemDone('a1', 1)
    markItemDone('c1', 1)
    expect(readDoneItems('a1')).toEqual([1])
    expect(readDoneItems('c1')).toEqual([1])
  })

  it('код уровня нечувствителен к регистру', () => {
    markItemDone('B1', 5)
    expect(readDoneItems('b1')).toEqual([5])
  })

  it('не трогает ключ уровней — на нём висит квота из админки', () => {
    markItemDone('a1', 1)
    expect(localStorage.getItem(SITUATIONS_KEY)).toBeNull()
    expect(localStorage.getItem(SITUATIONS_ITEMS_KEY)).toContain('a1')
  })

  it('мусор в хранилище не роняет чтение', () => {
    localStorage.setItem(SITUATIONS_ITEMS_KEY, '{ не json')
    expect(readDoneItems('a1')).toEqual([])
    localStorage.setItem(SITUATIONS_ITEMS_KEY, '[1,2,3]') // массив вместо карты
    expect(readDoneItems('a1')).toEqual([])
  })

  it('битые номера отбрасываются, а не превращаются в NaN', () => {
    localStorage.setItem(SITUATIONS_ITEMS_KEY, JSON.stringify({ a1: [1, 'два', null, 3] }))
    expect(readDoneItems('a1')).toEqual([1, 3])
  })

  it('пустой уровень или нечисловой id игнорируются', () => {
    markItemDone('', 1)
    markItemDone('a1', 'первый')
    expect(localStorage.getItem(SITUATIONS_ITEMS_KEY)).toBeNull()
  })
})
