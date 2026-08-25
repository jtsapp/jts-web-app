import { describe, it, expect } from 'vitest'
import { SCENARIOS, getScenario } from './scenarios.js'

describe('уровни сцен', () => {
  // Бейдж на карточке рисуется прямо из этого поля, поэтому опечатка в нём
  // («А2» кириллицей, «b1» строчными) молча уедет на экран как есть.
  it('у каждой сцены уровень из шкалы CEFR', () => {
    for (const s of SCENARIOS) {
      expect(['A1', 'A2', 'B1', 'B2', 'C1']).toContain(s.level)
    }
  })
})

describe('getScenario', () => {
  it('находит сцену по слагу', () => {
    expect(getScenario('hotel-check-in')).toBe(
      SCENARIOS.find((s) => s.id === 'hotel-check-in'),
    )
  })
  it('на неизвестный слаг отдаёт null, а не падает', () => {
    expect(getScenario('nope')).toBeNull()
  })
  it('на пустой вход отдаёт null', () => {
    expect(getScenario('')).toBeNull()
    expect(getScenario(null)).toBeNull()
  })
})
