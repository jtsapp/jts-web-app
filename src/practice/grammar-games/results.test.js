import { describe, expect, it, vi } from 'vitest'
import { createResultQueue } from './results.js'

const noWait = { wait: async () => {} }
const status = (code) => Object.assign(new Error(String(code)), { status: code })

describe('очередь сдач «Грамматики · игр»', () => {
  it('уходит ровно {topicId, game, stars}, ответ — монеты и лучший результат', async () => {
    const send = vi.fn(async () => ({ best: 2, coins: 3, balance: {} }))
    const q = createResultQueue(send, noWait)
    await expect(q.submit({ topicId: 'L1-01', game: 'pick', stars: 2, extra: 1 })).resolves.toEqual({ coins: 3, best: 2 })
    expect(send).toHaveBeenCalledWith({ topicId: 'L1-01', game: 'pick', stars: 2 })
  })

  it('сбой сети: звёзды ждут, уходят со следующей сдачей, монеты суммируются', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('Нет связи с сервером.')).mockResolvedValue({ best: 3, coins: 2 })
    const q = createResultQueue(send, noWait)
    expect(await q.submit({ topicId: 'L1-01', game: 'pick', stars: 3 })).toBeNull()
    expect(q.pendingStars()).toEqual({ 'L1-01': { pick: 3 } })
    expect(await q.submit({ topicId: 'L1-01', game: 'match', stars: 1 })).toEqual({ coins: 4, best: 3 })
    expect(q.pendingStars()).toEqual({})
  })

  it('заход в раздел досылает ждущее', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValue({ best: 2, coins: 3 })
    const q = createResultQueue(send, noWait)
    await q.submit({ topicId: 'L1-01', game: 'fix', stars: 2 })
    await expect(q.flush()).resolves.toBe(3)
    expect(q.pendingStars()).toEqual({})
  })

  it('409 повторяется, а не теряется', async () => {
    const send = vi.fn().mockRejectedValueOnce(status(409)).mockResolvedValue({ best: 1, coins: 0 })
    const q = createResultQueue(send, noWait)
    expect(await q.submit({ topicId: 'L1-01', game: 'fix', stars: 1 })).toEqual({ coins: 0, best: 1 })
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('отказ 4xx (тема скрыта) не копится', async () => {
    const send = vi.fn().mockRejectedValue(status(404))
    const q = createResultQueue(send, noWait)
    expect(await q.submit({ topicId: 'L1-01', game: 'fix', stars: 1 })).toBeNull()
    expect(q.pendingStars()).toEqual({})
  })

  it('ждущая сдача той же игры держит лучшие звёзды', async () => {
    const send = vi.fn().mockRejectedValue(new Error('net'))
    const q = createResultQueue(send, noWait)
    await q.submit({ topicId: 'L1-01', game: 'pick', stars: 3 })
    await q.submit({ topicId: 'L1-01', game: 'pick', stars: 1 })
    expect(q.pendingStars()).toEqual({ 'L1-01': { pick: 3 } })
  })
})
