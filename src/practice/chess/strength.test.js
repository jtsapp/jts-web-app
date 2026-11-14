// src/practice/chess/strength.test.js
import { describe, it, expect } from 'vitest'
import { clampBot, botSettings, levelKey, weakMove, FULL_STRENGTH } from './strength.js'

describe('сила бота', () => {
  it('рейтинг приводится к сетке 400–2800 с шагом 100', () => {
    expect(clampBot(150)).toBe(400)
    expect(clampBot(1349)).toBe(1300)
    expect(clampBot(1350)).toBe(1400)
    expect(clampBot(9000)).toBe(2800)
    expect(clampBot('x')).toBe(800)
  })
  it('от 1320 — родная шкала движка, без случайных ходов', () => {
    const s = botSettings(1400)
    expect(s.options).toEqual({ UCI_LimitStrength: 'true', UCI_Elo: 1400, 'Skill Level': 20 })
    expect(s.blunder).toBe(0)
    expect(s.go.movetime).toBeGreaterThanOrEqual(300)
    expect(botSettings(2800).go.movetime).toBe(1000)
  })
  it('ниже 1320 — малая глубина и доля слабых ходов', () => {
    const s = botSettings(400)
    expect(s.options).toEqual({ UCI_LimitStrength: 'false', UCI_Elo: 1320, 'Skill Level': 0 })
    expect(s.go).toEqual({ depth: 1 })
    expect(s.blunder).toBeCloseTo(0.5)
    expect(botSettings(800).blunder).toBeCloseTo(0.3)
    expect(botSettings(1200).blunder).toBeCloseTo(0.1)
  })
  it('чем выше рейтинг, тем не слабее настройки', () => {
    let prev = botSettings(400)
    for (let r = 500; r <= 1300; r += 100) {
      const s = botSettings(r)
      expect(s.go.depth).toBeGreaterThanOrEqual(prev.go.depth)
      expect(s.blunder).toBeLessThan(prev.blunder)
      prev = s
    }
  })
  it('подсказка — полная сила', () => {
    expect(FULL_STRENGTH.options.UCI_LimitStrength).toBe('false')
    expect(FULL_STRENGTH.options['Skill Level']).toBe(20)
    expect(FULL_STRENGTH.blunder).toBe(0)
  })
  it('подписи уровней', () => {
    expect(levelKey(400)).toBe('beginner')
    expect(levelKey(800)).toBe('novice')
    expect(levelKey(1200)).toBe('club')
    expect(levelKey(1600)).toBe('strongClub')
    expect(levelKey(2000)).toBe('expert')
    expect(levelKey(2200)).toBe('master')
    expect(levelKey(2500)).toBe('grandmaster')
  })
  it('слабый ход допустим и повторяется при том же генераторе', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const a = weakMove(fen, () => 0.42, true)
    expect(a).toEqual(weakMove(fen, () => 0.42, true))
    expect(a.from).toMatch(/^[a-h][12]$/)
  })
  it('осторожный слабый ход не ставит ферзя под бой, если есть другие', () => {
    // Белый ферзь d1, чёрная ладья d8 на открытой линии: Qd2…Qd7 под боем нет только у ходов вбок.
    const fen = '3r3k/8/8/8/8/8/8/3Q3K w - - 0 1'
    for (let i = 0; i < 20; i++) {
      const m = weakMove(fen, () => i / 20, true)
      if (m.from === 'd1') expect(m.to[0] === 'd' && m.to !== 'd8').toBe(false)
    }
  })
  it('в позиции без ходов возвращает null', () => {
    expect(weakMove('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', () => 0, true)).toBe(null)
  })
})
