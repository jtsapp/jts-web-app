import { describe, it, expect } from 'vitest'
import { createOfftopicGuard, createRateLimiter } from './rateLimit.js'

describe('лимит вопросов помощнику', () => {
  it('пропускает до лимита окна и закрывает на следующем', () => {
    const take = createRateLimiter({ windowLimit: 3, windowMs: 1000, dayLimit: 100, dayMs: 100000 })
    expect(take('u', 0).ok).toBe(true)
    expect(take('u', 10).ok).toBe(true)
    expect(take('u', 20).ok).toBe(true)
    const blocked = take('u', 30)
    expect(blocked.ok).toBe(false)
    // Откроется, когда первый вопрос выйдет из окна: 0 + 1000 − 30 = 970 мс.
    expect(blocked.retryAfterSec).toBe(1)
  })

  it('окно скользит: старые вопросы перестают считаться', () => {
    const take = createRateLimiter({ windowLimit: 2, windowMs: 1000, dayLimit: 100, dayMs: 100000 })
    take('u', 0)
    take('u', 500)
    expect(take('u', 900).ok).toBe(false)
    expect(take('u', 1001).ok).toBe(true)
  })

  it('отказ не расходует лимит', () => {
    const take = createRateLimiter({ windowLimit: 1, windowMs: 1000, dayLimit: 100, dayMs: 100000 })
    take('u', 0)
    for (let t = 1; t < 1000; t += 100) take('u', t)
    expect(take('u', 1000).ok).toBe(true)
  })

  it('суточный лимит держит, даже когда окно свободно', () => {
    const take = createRateLimiter({ windowLimit: 10, windowMs: 10, dayLimit: 3, dayMs: 1000 })
    take('u', 0)
    take('u', 100)
    take('u', 200)
    const blocked = take('u', 500)
    expect(blocked.ok).toBe(false)
    expect(take('u', 1000).ok).toBe(true)
  })

  it('ученики не делят лимит', () => {
    const take = createRateLimiter({ windowLimit: 1, windowMs: 1000, dayLimit: 10, dayMs: 100000 })
    expect(take('a', 0).ok).toBe(true)
    expect(take('b', 0).ok).toBe(true)
    expect(take('a', 1).ok).toBe(false)
  })
})

describe('возврат вопроса в лимит', () => {
  it('refund снимает последний засчитанный вопрос', () => {
    const take = createRateLimiter({ windowLimit: 1, windowMs: 1000, dayLimit: 10, dayMs: 100000 })
    expect(take('u', 0).ok).toBe(true)
    take.refund('u')
    expect(take('u', 1).ok).toBe(true)
    expect(take('u', 2).ok).toBe(false)
  })

  it('refund без вопросов ничего не ломает', () => {
    const take = createRateLimiter()
    expect(() => take.refund('никто')).not.toThrow()
  })
})

describe('сторож вопросов не по теме', () => {
  const guard = () => createOfftopicGuard({ dayLimit: 3, dayMs: 1000, cooldownMs: 100 })

  it('пауза включается на лимитном вопросе и длится cooldownMs', () => {
    const g = guard()
    g.record('u', 0)
    g.record('u', 10)
    expect(g.blockedFor('u', 11)).toBe(0)
    g.record('u', 20)
    expect(g.blockedFor('u', 21)).toBe(1)
    expect(g.blockedFor('u', 119)).toBe(1)
    expect(g.blockedFor('u', 120)).toBe(0)
  })

  it('после паузы следующий вопрос не по теме снова её включает — лимит суточный', () => {
    const g = guard()
    for (const t of [0, 10, 20]) g.record('u', t)
    g.record('u', 200)
    expect(g.blockedFor('u', 201)).toBeGreaterThan(0)
  })

  it('старые вопросы выпадают из суток', () => {
    const g = guard()
    g.record('u', 0)
    g.record('u', 10)
    g.record('u', 1500)
    expect(g.blockedFor('u', 1501)).toBe(0)
  })

  it('ученики не делят счётчик', () => {
    const g = guard()
    for (const t of [0, 1, 2]) g.record('a', t)
    expect(g.blockedFor('b', 3)).toBe(0)
  })
})
