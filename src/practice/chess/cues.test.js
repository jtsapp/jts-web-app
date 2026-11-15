// src/practice/chess/cues.test.js
import { describe, it, expect } from 'vitest'
import { cueOf } from './cues.js'

const mv = (over = {}) => ({ san: 'e4', flags: 'b', captured: null, promotion: null, ...over })

describe('звук хода', () => {
  it('обычный ход, взятие, рокировка, превращение, шах', () => {
    expect(cueOf(mv(), null, 'w')).toBe('move')
    expect(cueOf(mv({ san: 'exd5', flags: 'c', captured: 'p' }), null, 'w')).toBe('capture')
    expect(cueOf(mv({ san: 'O-O', flags: 'k' }), null, 'w')).toBe('castle')
    expect(cueOf(mv({ san: 'O-O-O', flags: 'q' }), null, 'w')).toBe('castle')
    expect(cueOf(mv({ san: 'a8=Q', flags: 'p', promotion: 'q' }), null, 'w')).toBe('promote')
    expect(cueOf(mv({ san: 'Qh5+', flags: 'n' }), null, 'w')).toBe('check')
  })
  it('приоритет: конец партии → шах → превращение → взятие → рокировка', () => {
    expect(cueOf(mv({ san: 'bxa8=Q+', flags: 'cp', captured: 'r', promotion: 'q' }), null, 'w')).toBe('check')
    expect(cueOf(mv({ san: 'bxa8=Q', flags: 'cp', captured: 'r', promotion: 'q' }), null, 'w')).toBe('promote')
    expect(cueOf(mv({ san: 'Qxf7#', flags: 'c', captured: 'p' }), { result: '1-0', reason: 'checkmate' }, 'w')).toBe('win')
  })
  it('конец партии звучит со стороны ученика', () => {
    expect(cueOf(null, { result: '1-0', reason: 'resignation' }, 'b')).toBe('lose')
    expect(cueOf(null, { result: '0-1', reason: 'timeout' }, 'b')).toBe('win')
    expect(cueOf(null, { result: '1/2-1/2', reason: 'stalemate' }, 'w')).toBe('draw')
  })
})
