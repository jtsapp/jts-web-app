// src/practice/chess/clock.test.js
import { describe, it, expect } from 'vitest'
import { newClock, fromSnapshot, remaining, switchTo, pause, flagged, snapshot } from './clock.js'

describe('часы', () => {
  it('без времени часов нет', () => expect(newClock(0)).toBe(null))
  it('до первого хода стоят', () => {
    const c = newClock(5)
    expect(remaining(c, 'w', 99999)).toBe(300000)
    expect(flagged(c, 99999)).toBe(null)
  })
  it('идут у той стороны, чей ход, и считаются от отметки', () => {
    let c = switchTo(newClock(5), 'b', 1000)
    expect(remaining(c, 'b', 4000)).toBe(297000)
    expect(remaining(c, 'w', 4000)).toBe(300000)
    c = switchTo(c, 'w', 4000)
    expect(snapshot(c, 9000)).toEqual({ w: 295000, b: 297000 })
  })
  it('пауза фиксирует остаток и останавливает', () => {
    const c = pause(switchTo(newClock(5), 'w', 0), 2000)
    expect(c.running).toBe(null)
    expect(remaining(c, 'w', 50000)).toBe(298000)
  })
  it('ноль — флаг у идущей стороны, ниже нуля остаток не уходит', () => {
    const c = switchTo(fromSnapshot({ w: 1000, b: 5000 }), 'w', 0)
    expect(flagged(c, 999)).toBe(null)
    expect(flagged(c, 1000)).toBe('w')
    expect(remaining(c, 'w', 5000)).toBe(0)
  })
  it('без часов функции безопасны', () => {
    expect(switchTo(null, 'w', 0)).toBe(null)
    expect(pause(null, 0)).toBe(null)
    expect(flagged(null, 0)).toBe(null)
    expect(snapshot(null, 0)).toBe(null)
  })
})
