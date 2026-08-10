import { describe, it, expect } from 'vitest'
import { KINGDOMS, computeKingdoms, roleForLevel } from './kingdoms.js'

describe('раскладка королевств', () => {
  it('шесть городов, уровни от A0 до C1, C2 нет', () => {
    expect(KINGDOMS.map((k) => k.level)).toEqual(['A0', 'A1', 'A2', 'B1', 'B2', 'C1'])
  })

  it('города, короли и позиции не переехали', () => {
    expect(KINGDOMS.map((k) => k.id)).toEqual(['sunhaven', 'greendale', 'bridgeport', 'highspire', 'frostcrystal', 'goldcrown'])
    expect(KINGDOMS[0]).toMatchObject({ name: 'Redtown', king: 'Майкл Флот', map: { x: 45, y: 85 }, ring: '#EF6C2E' })
    expect(KINGDOMS[5]).toMatchObject({ name: 'Rosewind Town', level: 'C1' })
  })

  it('ни один город больше не «скоро»', () => {
    expect(KINGDOMS.some((k) => k.comingSoon)).toBe(false)
  })
})

describe('computeKingdoms', () => {
  it('новичку открыт A0 и закрыт A1', () => {
    const open = computeKingdoms('A0')
    expect(open.find((k) => k.level === 'A0')).toMatchObject({ unlocked: true, current: true })
    expect(open.find((k) => k.level === 'A1').unlocked).toBe(false)
  })

  it('уровень студента открывает всё до него включительно', () => {
    const open = computeKingdoms('B1')
    expect(open.filter((k) => k.unlocked).map((k) => k.level)).toEqual(['A0', 'A1', 'A2', 'B1'])
    expect(open.find((k) => k.current).level).toBe('B1')
  })

  it('C2 у студента не ломает карту — текущим становится C1', () => {
    const open = computeKingdoms('C2')
    expect(open.every((k) => k.unlocked)).toBe(true)
    expect(open.find((k) => k.current).level).toBe('C1')
  })

  it('звание A0 сохранено', () => {
    expect(roleForLevel('A0')).toMatchObject({ key: 'merchant' })
  })
})
