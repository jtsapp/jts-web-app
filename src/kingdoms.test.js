import { describe, it, expect } from 'vitest'
import { computeKingdoms } from './kingdoms.js'

function unlockedLevels(userLevel) {
  return computeKingdoms(userLevel).filter((k) => k.unlocked).map((k) => k.level)
}

describe('карта «Повторения»: открыт свой CEFR и всё, что ниже', () => {
  it('у B1 открыты A0–B1, закрыты B2 и C1', () => {
    expect(unlockedLevels('B1')).toEqual(['A0', 'A1', 'A2', 'B1'])
    const k = computeKingdoms('B1')
    expect(k.find((x) => x.level === 'B1').current).toBe(true)
    expect(k.find((x) => x.level === 'B2').unlocked).toBe(false)
    expect(k.find((x) => x.level === 'C1').unlocked).toBe(false)
  })

  it('у A2 открыты A0–A2', () => {
    expect(unlockedLevels('A2')).toEqual(['A0', 'A1', 'A2'])
  })

  it('новичку с A0 всё равно открыт вход с A1', () => {
    expect(unlockedLevels('A0')).toEqual(['A0', 'A1'])
  })
})
