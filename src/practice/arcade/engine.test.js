import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, ROUND_SECONDS, advance, initialState, isLost, isOver } from './engine.js'
import { createVoiceActivity } from './voiceActivity.js'

// Правила раунда кадр за кадром.

describe('arcade engine', () => {
  it('шум комнаты после калибровки — это тишина: пила доходит до дерева за весь лимит', () => {
    const detect = createVoiceActivity(0.03)
    let state = initialState()
    for (let ms = 0; ms < 10000; ms += 20) state = advance(state, detect(0.032, ms), 0.02, 10)
    expect(state.danger).toBeGreaterThan(0.99999)
    expect(state.speaking).toBe(0)
  })

  it('гистерезис голоса: щелчок не включает, провал между слогами не выключает', () => {
    const detect = createVoiceActivity(0.003)
    expect(detect(0.08, 0)).toBe(false)
    expect(detect(0, 20)).toBe(false)
    expect(detect(0.08, 100)).toBe(false)
    expect(detect(0.08, 180)).toBe(true)
    expect(detect(0.001, 350)).toBe(true)
    expect(detect(0.001, 500)).toBe(false)
  })

  it('речь отгоняет пилу, тишина возвращает; рестарт обнуляет и то, и другое', () => {
    const detect = createVoiceActivity(0.002)
    let state = initialState()
    for (let ms = 0; ms < 6000; ms += 20) state = advance(state, detect(ms >= 3000 ? 0.09 : 0.001, ms), 0.02, 10)
    expect(state.danger).toBeLessThan(0.15)
    expect(state.speaking).toBeGreaterThan(2.8)
    const before = state.danger
    for (let ms = 6000; ms < 8000; ms += 20) state = advance(state, detect(0.001, ms), 0.02, 10)
    expect(state.danger).toBeGreaterThan(before)
    expect(state.stops).toBe(1)
    state = initialState()
    expect(state.danger).toBe(0)
    expect(state.elapsed).toBe(0)
  })

  for (const { key, limit } of DIFFICULTIES) {
    it(`${key}: молчание доводит пилу до дерева ровно за ${limit} с`, () => {
      const result = advance(initialState(), false, limit + 3, limit)
      expect(result.danger).toBe(1)
      expect(result.silence).toBe(limit)
      expect(result.elapsed).toBe(limit)
      expect(isLost(result)).toBe(true)
      expect(isOver(result)).toBe(true)
    })
  }

  it('речь отгоняет медленнее, чем тишина приближает; остановки считаются один раз', () => {
    let s = advance(initialState(), false, 5, 10)
    s = advance(s, true, 2, 10)
    expect(s.danger).toBeGreaterThan(0.3)
    expect(s.danger).toBeLessThan(0.5)
    s = advance(s, false, 0.2, 10)
    s = advance(s, false, 0.2, 10)
    expect(s.stops).toBe(1)
    s = advance(s, true, 20, 10)
    expect(s.danger).toBe(0)
    expect(Math.abs(s.speaking + s.silence - s.elapsed)).toBeLessThan(1e-8)
  })

  it('раунд кончается на 60 секундах, даже если кадр опоздал', () => {
    const result = advance(initialState(), true, 65, 10)
    expect(result.elapsed).toBe(ROUND_SECONDS)
    expect(result.speaking).toBe(60)
    expect(result.silence).toBe(0)
    expect(isLost(result)).toBe(false)
    expect(isOver(result)).toBe(true)
  })

  it('сложности — те же, что в исходной игре', () => {
    expect(DIFFICULTIES.map((d) => d.limit)).toEqual([12, 10, 5, 2.5])
  })
})
