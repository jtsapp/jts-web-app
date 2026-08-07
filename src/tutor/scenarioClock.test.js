import { describe, it, expect } from 'vitest'
import {
  CLOCK_GRACE_SEC,
  CLOCK_CUT_LEAD_SEC,
  clampTtlForScenario,
  cutAtSec,
} from './scenarioClock.js'

describe('clampTtlForScenario', () => {
  it('режет ttl до бюджета сцены плюс запас', () => {
    expect(clampTtlForScenario(1200, 300)).toBe(300 + CLOCK_GRACE_SEC)
  })
  it('не поднимает ttl, если дневного лимита осталось меньше бюджета', () => {
    expect(clampTtlForScenario(120, 300)).toBe(120)
  })
  it('без бюджета сцены отдаёт ttl как есть', () => {
    expect(clampTtlForScenario(1200, 0)).toBe(1200)
    expect(clampTtlForScenario(1200, undefined)).toBe(1200)
  })
})

describe('cutAtSec', () => {
  it('рвёт связь за CLOCK_CUT_LEAD_SEC до конца бюджета', () => {
    expect(cutAtSec(300)).toBe(300 - CLOCK_CUT_LEAD_SEC)
  })
  it('не уходит в минус на коротком бюджете', () => {
    expect(cutAtSec(5)).toBe(0)
  })
  it('без бюджета сцены обрыва нет', () => {
    expect(cutAtSec(0)).toBeNull()
    expect(cutAtSec(undefined)).toBeNull()
  })
})
