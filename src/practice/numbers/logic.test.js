import { describe, expect, it } from 'vitest'
import { GEN_ROUND, buildRound, exSay, jumpOutcome, positionPlan, rateFor, sayText, spokenOf, starsFor } from './logic.js'

// Детерминированная случайность для повторяемых тестов.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const L = (say, a, d1, d2, fb) => [say, a, d1, d2, fb || '', 'L']
const R = (label, cue, a, d1, d2, fb, say) => [say || a, a, d1, d2, fb || '', 'R', label, cue]

describe('positionPlan', () => {
  it('слоты поровну (±1) и никогда три подряд', () => {
    for (let seed = 1; seed < 60; seed++) {
      for (const n of [9, 14, 16, 18]) {
        const p = positionPlan(n, mulberry32(seed))
        const counts = [0, 1, 2].map((s) => p.filter((x) => x === s).length)
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
        for (let i = 2; i < n; i++) expect(p[i] === p[i - 1] && p[i] === p[i - 2]).toBe(false)
      }
    }
  })
})

describe('buildRound', () => {
  it('тема играет все задания, mix — первая половина со словами', () => {
    const items = Array.from({ length: 10 }, (_, i) => L(`w${i}`, String(i), 'x', 'y'))
    const out = buildRound({ id: 't' }, { hear: 'mix', items }, {}, mulberry32(3))
    expect(out).toHaveLength(10)
    expect(out.slice(0, 5).every((it) => it[9] === 'show')).toBe(true)
    expect(out.slice(5).every((it) => it[9] === 'listen')).toBe(true)
    expect(out.every((it) => it[10] === 0.85)).toBe(true)
  })

  it('босс: свои задания первыми, всего 16, ответы не повторяются, редко показанные — раньше', () => {
    const tagged = (it, src) => { const c = it.slice(); c[8] = src; return c }
    const own = Array.from({ length: 4 }, (_, i) => tagged(L(`own${i}`, `o${i}`, 'x', 'y'), 'boss1'))
    const items = []
    for (const src of ['a', 'b', 'c']) for (let i = 0; i < 12; i++) items.push(tagged(L(`${src}${i}`, `${src}-${i % 9}`, 'x', 'y'), src))
    const seen = { 'a0→a-0': 5 }
    const out = buildRound({ id: 'boss1', boss: true }, { hear: 'listen', rate: 0.95, own, items }, seen, mulberry32(7))
    expect(out).toHaveLength(GEN_ROUND)
    expect(own.every((o) => out.some((it) => it[0] === o[0]))).toBe(true)
    expect(new Set(out.map((it) => it[1])).size).toBe(GEN_ROUND)
    expect(out.every((it) => it[9] === 'listen' && it[10] === 0.95)).toBe(true)
  })

  it('нарастание темпа: от 1.0 на шаг 0.02, не выше 1.3', () => {
    expect(rateFor([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'ramp'], 0)).toBe(1)
    expect(rateFor([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'ramp'], 5)).toBeCloseTo(1.1)
    expect(rateFor([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'ramp'], 40)).toBe(1.3)
    expect(rateFor([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.05], 3)).toBe(1.05)
  })
})

describe('что произносится', () => {
  it('метки ударения опускаются, имена месяцев — нет, скобки не читаются', () => {
    expect(sayText('thirTEEN')).toBe('thirteen')
    expect(sayText('THIRty')).toBe('thirty')
    expect(sayText('the fifth of May')).toBe('the fifth of May')
    expect(sayText('two–nil (UK football)')).toBe('two–nil')
    expect(sayText('(a) quarter past six')).toBe('quarter past six')
  })

  it('задание на чтение: пропуск — целой фразой, 21st — словами подсказки, явный say', () => {
    expect(spokenOf(R('Choose the word', 'How much ___ these shoes?', 'are', 'is', 'cost'))).toBe('How much are these shoes?')
    expect(spokenOf(R('Choose the short form', 'twenty-first', '21st', '21th', '21nd'))).toBe('twenty-first')
    expect(spokenOf(R('Which number is it?', 'nil (a football score)', '0', '9', '11', '', 'nil'))).toBe('nil')
    expect(spokenOf(R('Where is the stress?', '13', 'thirTEEN', 'THIRty', 'thirTY'))).toBe('thirteen')
    expect(spokenOf(L('seven', '7', '11', '17'))).toBe('seven')
  })

  it('примеры объяснений: диалог как есть, остальное через sayText', () => {
    expect(exSay(['?', 'Sorry, is that one-three?'])).toBe('Sorry, is that one-three?')
    expect(exSay(['13', 'thirTEEN'])).toBe('thirteen')
  })
})

describe('итог прыжка', () => {
  it('чисто — 3 кристалла, с третьего подряд +1, с шестого +2', () => {
    expect(jumpOutcome({ attempts: 0, shown: false, mode: 'listen', revealed: false, combo: 0 })).toEqual({ kind: 'gold', gain: 3, score: 1, combo: 1 })
    expect(jumpOutcome({ attempts: 0, shown: true, mode: 'show', revealed: false, combo: 2 }).gain).toBe(4)
    expect(jumpOutcome({ attempts: 0, shown: false, mode: 'listen', revealed: false, combo: 5 }).gain).toBe(5)
  })
  it('подсказка на слух — серебро 0.75, ошибка — 0.5, подсвеченный остров — 0', () => {
    expect(jumpOutcome({ attempts: 0, shown: true, mode: 'listen', revealed: false, combo: 3 })).toEqual({ kind: 'silver', gain: 2, score: 0.75, combo: 0 })
    expect(jumpOutcome({ attempts: 1, shown: false, mode: 'listen', revealed: false, combo: 3 }).score).toBe(0.5)
    expect(jumpOutcome({ attempts: 2, shown: true, mode: 'listen', revealed: true, combo: 3 })).toEqual({ kind: 'miss', gain: 0, score: 0, combo: 0 })
  })
  it('звёзды', () => {
    expect([starsFor(1, true), starsFor(0.9, true), starsFor(0.7, true), starsFor(0.9, false)]).toEqual([3, 2, 1, 0])
  })
})
