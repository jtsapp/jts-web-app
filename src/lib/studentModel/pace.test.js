// Темп: 3 ошибки подряд — проще; ниже 70 % — проще; 90 %+ и быстро — сложнее; иначе около 80 % (ТЗ v2.0, 8.3).
import { describe, expect, it } from 'vitest'
import { paceOf } from './pace.js'

const NOW = Date.parse('2026-11-08T10:00:00Z')
// newest-first не обязателен: paceOf сортирует сам
const seq = (oks, { item = 'ggame:L2-03', gap = 5000, step = 20_000 } = {}) =>
  oks.map((ok, i) => ({ item, ok, gapMs: gap, at: NOW - (oks.length - 1 - i) * step, title: 'Past Simple' }))

describe('paceOf', () => {
  it('нет ответов — none', () => {
    expect(paceOf([], NOW).verdict).toBe('none')
  })

  it('3 ошибки подряд в одной теме — проще, даже при малом числе ответов', () => {
    const p = paceOf(seq([true, false, false, false]), NOW)
    expect(p).toMatchObject({ verdict: 'easier', why: 'streak', item: 'ggame:L2-03', streak: 3 })
  })

  it('3 ошибки в разных темах — не «эта тема не идёт»', () => {
    const a = [
      { item: 'ggame:L2-01', ok: false, at: NOW - 3000, gapMs: 4000 },
      { item: 'ggame:L2-02', ok: false, at: NOW - 2000, gapMs: 4000 },
      { item: 'ggame:L2-03', ok: false, at: NOW - 1000, gapMs: 4000 },
    ]
    expect(paceOf(a, NOW).verdict).toBe('hold')
  })

  it('меньше 70 % верных при 8+ ответах — проще', () => {
    const p = paceOf(seq([true, false, true, false, true, false, false, true, true, false]), NOW)
    expect(p).toMatchObject({ verdict: 'easier', why: 'low', n: 10 })
  })

  it('около 80 % — в норме', () => {
    const p = paceOf(seq([true, true, false, true, true, true, true, false, true, true]), NOW)
    expect(p.verdict).toBe('hold')
    expect(p.accuracy).toBeCloseTo(0.8)
  })

  it('90 %+ и быстро — сложнее; 90 % без замеров паузы — не «быстро»', () => {
    const oks = [true, true, true, true, true, false, true, true, true, true, true, true]
    expect(paceOf(seq(oks), NOW)).toMatchObject({ verdict: 'harder', why: 'high' })
    expect(paceOf(seq(oks, { gap: null }), NOW).verdict).toBe('hold')
    expect(paceOf(seq(oks, { gap: 30_000 }), NOW).verdict).toBe('hold')
  })

  it('8 верных быстрых подряд — сложнее', () => {
    expect(paceOf(seq([true, true, true, true, true, true, true, true]), NOW)).toMatchObject({ verdict: 'harder', why: 'fast', streak: 8 })
  })

  it('ответы старше 90 минут не считаются', () => {
    const old = seq([false, false, false], { step: 60 * 60_000 }).map((a) => ({ ...a, at: a.at - 2 * 60 * 60_000 }))
    expect(paceOf(old, NOW).verdict).toBe('none')
  })
})
