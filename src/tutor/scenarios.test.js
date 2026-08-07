import { describe, it, expect } from 'vitest'
import { SCENARIOS, getScenario } from './scenarios.js'

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
