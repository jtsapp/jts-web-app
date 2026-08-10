import { describe, it, expect } from 'vitest'
import { micLevel, MIC_FLOOR } from './micLevel.js'

const HEARING = { micOn: true, listening: true }

describe('micLevel', () => {
  it('молчит, когда микрофон выключен', () => {
    expect(micLevel(0.5, { micOn: false, listening: true })).toBe(0)
  })

  it('молчит, когда очередь тьютора', () => {
    // Кольцо во время реплики тьютора врало бы: его речь ловится микрофоном
    // ученика через динамики, и кнопка дышала бы от чужого голоса.
    expect(micLevel(0.5, { micOn: true, listening: false })).toBe(0)
  })

  it('отсекает шум комнаты порогом', () => {
    expect(micLevel(MIC_FLOOR, HEARING)).toBe(0)
    expect(micLevel(MIC_FLOOR / 2, HEARING)).toBe(0)
    expect(micLevel(0, HEARING)).toBe(0)
  })

  it('растёт от громкости выше порога', () => {
    const quiet = micLevel(0.05, HEARING)
    const loud = micLevel(0.2, HEARING)
    expect(quiet).toBeGreaterThan(0)
    expect(loud).toBeGreaterThan(quiet)
  })

  it('не выходит за единицу на крике', () => {
    expect(micLevel(1, HEARING)).toBe(1)
    expect(micLevel(50, HEARING)).toBe(1)
  })

  it('переживает мусор вместо числа', () => {
    // useTrackVolume до подписки на трек может отдать undefined/NaN, и это не
    // повод сломать кнопку мьюта посреди звонка.
    expect(micLevel(undefined, HEARING)).toBe(0)
    expect(micLevel(NaN, HEARING)).toBe(0)
    expect(micLevel(Infinity, HEARING)).toBe(0)
  })

  it('без состояния считает, что показывать нечего', () => {
    expect(micLevel(0.5)).toBe(0)
  })
})
