// Интервальное повторение модели ученика: 1, 3, 7, 14 дней (ТЗ v2.0, 8.3), статусы карты тем (8.1).
import { describe, expect, it } from 'vitest'
import { INTERVAL_DAYS, MASTER_BOX, STATUS, srStatus, srStep } from './sr.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = Date.parse('2026-11-08T10:00:00Z')

describe('srStep', () => {
  it('первая встреча — коробка 0, повторить завтра', () => {
    const s = srStep(null, false, T0)
    expect(s).toMatchObject({ box: 0, dueAt: T0 + DAY, seen: 1, correct: 0, daySeen: 1, dayWrong: 1 })
    expect(srStatus(s, T0)).toBe(STATUS.learning)
  })

  it('верные повторения по сроку ведут 1 → 3 → 7 → 14 дней и в «освоено»', () => {
    let s = srStep(null, true, T0)
    let t = T0
    const waits = []
    for (let i = 0; i < MASTER_BOX; i++) {
      t = s.dueAt
      expect(srStatus(s, t)).toBe(STATUS.due)
      s = srStep(s, true, t)
      waits.push(Math.round((s.dueAt - t) / DAY))
    }
    expect(waits).toEqual(INTERVAL_DAYS.slice(1, 5))
    expect(s.box).toBe(MASTER_BOX)
    expect(srStatus(s, t + DAY)).toBe(STATUS.mastered)
    // поддерживающее повторение раз в 30 дней — потом снова «пора повторить»
    expect(srStatus(s, t + 31 * DAY)).toBe(STATUS.due)
  })

  it('ответы до срока коробку не двигают — десяток вопросов в игре не проходит повторения', () => {
    let s = srStep(null, true, T0)
    for (let i = 1; i <= 10; i++) s = srStep(s, true, T0 + i * 1000)
    expect(s.box).toBe(0)
    expect(s.dueAt).toBe(T0 + DAY)
    expect(s.seen).toBe(11)
  })

  it('ошибка на повторении — коробка 0, завтра, срыв +1', () => {
    let s = srStep(null, true, T0)
    s = srStep(s, true, s.dueAt) // коробка 1, через 3 дня
    const t = s.dueAt
    s = srStep(s, false, t)
    expect(s).toMatchObject({ box: 0, dueAt: t + DAY, lapses: 1 })
  })

  it('одна оговорка из многих до срока — не откат; провальный день (3+ ошибки, < 80 %) — откат', () => {
    let s = srStep(null, true, T0)
    s = srStep(s, true, s.dueAt) // коробка 1
    const day = s.dueAt - 2 * DAY // до срока, другой день
    let k = srStep(s, true, day)
    for (let i = 1; i <= 8; i++) k = srStep(k, true, day + i * 1000)
    k = srStep(k, false, day + 9000)
    expect(k.box).toBe(1)
    let f = srStep(s, false, day)
    f = srStep(f, false, day + 1000)
    expect(f.box).toBe(1) // две ошибки — ещё нет
    f = srStep(f, false, day + 2000)
    expect(f).toMatchObject({ box: 0, dueAt: day + 2000 + DAY, lapses: 1 })
  })

  it('новый день сбрасывает счёт дня', () => {
    let s = srStep(null, false, T0)
    s = srStep(s, false, T0 + 1000)
    s = srStep(s, true, T0 + 2 * DAY)
    expect(s.daySeen).toBe(1)
    expect(s.dayWrong).toBe(0)
  })

  it('нет строки — «не изучено»', () => {
    expect(srStatus(null, T0)).toBe(STATUS.new)
  })
})
