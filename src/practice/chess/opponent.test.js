// src/practice/chess/opponent.test.js
import { describe, it, expect, vi } from 'vitest'
import { createBotOpponent } from './opponent.js'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const engineThat = (move) => ({ search: vi.fn(async () => ({ move, score: null, cancelled: false })), stop: vi.fn() })
const noSleep = () => Promise.resolve()

describe('соперник-бот', () => {
  it('сильный бот берёт ход движка с настройками своего рейтинга', async () => {
    const engine = engineThat({ from: 'e2', to: 'e4' })
    const bot = createBotOpponent({ engine, rating: 1500, rng: () => 0, sleep: noSleep })
    expect(await bot.requestMove(START)).toEqual({ from: 'e2', to: 'e4' })
    expect(engine.search.mock.calls[0][1].options.UCI_Elo).toBe(1500)
  })
  it('слабый бот с выпавшей ошибкой ходит сам, движок не спрашивает', async () => {
    const engine = engineThat({ from: 'e2', to: 'e4' })
    const bot = createBotOpponent({ engine, rating: 400, rng: () => 0.1, sleep: noSleep })
    const m = await bot.requestMove(START)
    expect(m.from).toMatch(/^[a-h][12]$/)
    expect(engine.search).not.toHaveBeenCalled()
  })
  it('слабый бот без выпавшей ошибки спрашивает движок', async () => {
    const engine = engineThat({ from: 'g1', to: 'f3' })
    const bot = createBotOpponent({ engine, rating: 400, rng: () => 0.9, sleep: noSleep })
    expect(await bot.requestMove(START)).toEqual({ from: 'g1', to: 'f3' })
  })
  it('отвечает не раньше минимальной паузы', async () => {
    vi.useFakeTimers()
    const bot = createBotOpponent({ engine: engineThat({ from: 'e2', to: 'e4' }), rating: 1500, minDelay: 400 })
    let done = false
    bot.requestMove(START).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(399)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
    vi.useRealTimers()
  })
  it('отмена: ход отброшен, движку сказано stop', async () => {
    const engine = engineThat({ from: 'e2', to: 'e4' })
    const bot = createBotOpponent({ engine, rating: 1500, sleep: noSleep })
    const p = bot.requestMove(START)
    bot.cancel()
    expect(await p).toBe(null)
    expect(engine.stop).toHaveBeenCalled()
  })
  it('отменённый движком поиск — null', async () => {
    const engine = { search: async () => ({ move: null, score: null, cancelled: true }), stop() {} }
    const bot = createBotOpponent({ engine, rating: 1500, sleep: noSleep })
    expect(await bot.requestMove(START)).toBe(null)
  })
})
