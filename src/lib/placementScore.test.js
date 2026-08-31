import { describe, it, expect } from 'vitest'
import { simulateSession } from '../practice/placement/engine.generated.js'
import { scorePlacementSession, loadFullBank } from './placementScore.js'

// Полный банк = публичная часть (её видит браузер) + ключи, которые остались
// на сервере. Прогоны движка идут по нему, а пересчёт — из тех же ключей.
const source = loadFullBank()

/** Прогон движка (тот же, которым школа валидирует банк) → журнал сессии. */
const run = (pattern, seed = 7) =>
  simulateSession(source.bank, source.manifest, source.vocab, seed, pattern, 'express').exportJson()

describe('scorePlacementSession', () => {
  it('повторяет вердикт движка по сырым ответам: слабый прогон → A0', () => {
    const session = run('weak')
    const scored = scorePlacementSession(session, source)

    expect(session.result.level).toBe('A0')
    expect(scored.level).toBe('A0')
    expect(scored.flags).toContain('a0_branch')
  })

  it('сильный прогон пересчитывается в верхнюю полосу', () => {
    const session = run('strong')
    const scored = scorePlacementSession(session, source)

    expect(session.result.level).toBe('C2')
    expect(scored.level).toBe('C2')
  })

  it('средний прогон совпадает с клиентским уровнем', () => {
    const session = run('mid', 3)
    const scored = scorePlacementSession(session, source)

    expect(scored.level).toBe(session.result.level)
  })

  it('заявленный уровень не влияет на пересчёт: сервер смотрит только ответы', () => {
    // Клиент присылает журнал слабого прогона, но объявляет себе C2.
    const session = run('weak')
    session.result = { ...session.result, level: 'C2', theta: 3 }

    expect(scorePlacementSession(session, source).level).toBe('A0')
  })

  it('подделанная самооценка не поднимает уровень', () => {
    // theta0 из журнала — это самооценка; берём только допустимые значения.
    const session = run('weak')
    session.theta0 = 99

    const scored = scorePlacementSession(session, source)
    expect(Number.isFinite(scored.theta)).toBe(true)
    expect(scored.level).toBe('A0')
  })

  it('незнакомые задания в журнал не идут и уровень не двигают', () => {
    const session = run('mid', 5)
    const withJunk = { ...session, log: [...session.log, { id: 'no-such-item', optIndex: 0 }] }

    const scored = scorePlacementSession(withJunk, source)
    expect(scored.level).toBe(scorePlacementSession(session, source).level)
  })

  it('пустой журнал не роняет пересчёт', () => {
    const scored = scorePlacementSession({ log: [] }, source)
    expect(scored.level).toBe('A0') // без ответов разминка считается проваленной
    expect(scored.verified).toBe(0)
  })

  it('считает, сколько ответов удалось перепроверить', () => {
    const session = run('mid', 11)
    const scored = scorePlacementSession(session, source)

    expect(scored.verified).toBeGreaterThan(0)
    expect(scored.verified + scored.unverified).toBe(session.log.length)
  })
})
