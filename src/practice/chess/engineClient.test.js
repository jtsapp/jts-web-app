// src/practice/chess/engineClient.test.js
import { describe, it, expect, vi } from 'vitest'
import { createEngine, parseBestMove, parseScore } from './engineClient.js'

// Воркер-заглушка: записывает команды и отвечает строками, как UCI-движок.
function fakeWorker({ silent = false } = {}) {
  const w = {
    sent: [], terminated: false, onmessage: null, onerror: null,
    say(line) { w.onmessage?.({ data: line }) },
    postMessage(cmd) {
      w.sent.push(cmd)
      if (silent) return
      if (cmd === 'uci') queueMicrotask(() => w.say('uciok'))
      if (cmd === 'isready') queueMicrotask(() => w.say('readyok'))
    },
    terminate() { w.terminated = true },
  }
  return w
}
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
// Цепочка «очередь → ready → поиск» проходит несколько микрозадач; ждём целый тик, а не гадаем сколько.
const tick = () => new Promise((r) => setTimeout(r, 0))

describe('разбор строк UCI', () => {
  it('ход, превращение и «нет хода»', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toEqual({ from: 'e2', to: 'e4' })
    expect(parseBestMove('bestmove a7a8q')).toEqual({ from: 'a7', to: 'a8', promotion: 'q' })
    expect(parseBestMove('bestmove (none)')).toBe(null)
  })
  it('оценка в сантипешках и мат', () => {
    expect(parseScore('info depth 10 score cp -34 nodes 1')).toEqual({ cp: -34 })
    expect(parseScore('info depth 10 score mate 3 pv a1a2')).toEqual({ mate: 3 })
    expect(parseScore('info string hello')).toBe(null)
  })
})

describe('клиент движка', () => {
  it('поднимается рукопожатием uci → isready', async () => {
    const w = fakeWorker()
    const e = createEngine({ makeWorker: () => w })
    await e.ready
    expect(w.sent).toEqual(['uci', 'isready'])
  })
  it('поиск шлёт опции, позицию и go; возвращает ход и последнюю оценку', async () => {
    const w = fakeWorker()
    const e = createEngine({ makeWorker: () => w })
    const p = e.search(START, { options: { UCI_LimitStrength: 'true', UCI_Elo: 1500 }, go: { movetime: 300 } })
    await e.ready
    await tick()
    expect(w.sent.slice(2)).toEqual([
      'setoption name UCI_LimitStrength value true', 'setoption name UCI_Elo value 1500',
      `position fen ${START}`, 'go movetime 300',
    ])
    w.say('info depth 5 score cp 20')
    w.say('info depth 6 score cp 31')
    w.say('bestmove g1f3 ponder d7d5')
    expect(await p).toEqual({ move: { from: 'g1', to: 'f3' }, score: { cp: 31 }, cancelled: false })
  })
  it('глубина вместо времени', async () => {
    const w = fakeWorker()
    const e = createEngine({ makeWorker: () => w })
    e.search(START, { go: { depth: 2 } })
    await e.ready
    await tick()
    expect(w.sent.at(-1)).toBe('go depth 2')
  })
  it('поиски идут по одному: второй ждёт bestmove первого', async () => {
    const w = fakeWorker()
    const e = createEngine({ makeWorker: () => w })
    const a = e.search(START, { go: { depth: 1 } })
    const b = e.search(START, { go: { depth: 3 } })
    await e.ready
    await tick()
    expect(w.sent.filter((c) => c.startsWith('go'))).toEqual(['go depth 1'])
    w.say('bestmove e2e4')
    await a
    await tick()
    expect(w.sent.filter((c) => c.startsWith('go'))).toEqual(['go depth 1', 'go depth 3'])
    w.say('bestmove d2d4')
    expect((await b).move).toEqual({ from: 'd2', to: 'd4' })
  })
  it('stop отменяет поиск: ход отброшен, cancelled', async () => {
    const w = fakeWorker()
    const e = createEngine({ makeWorker: () => w })
    const p = e.search(START, { go: { movetime: 1000 } })
    await e.ready
    await tick()
    e.stop()
    expect(w.sent.at(-1)).toBe('stop')
    w.say('bestmove e2e4')
    expect(await p).toEqual({ move: null, score: null, cancelled: true })
  })
  it('молчащий движок — ready отклоняется по сроку и зовёт onCrash', async () => {
    vi.useFakeTimers()
    const onCrash = vi.fn()
    const e = createEngine({ makeWorker: () => fakeWorker({ silent: true }), readyTimeout: 500, onCrash })
    const failed = e.ready.then(() => 'ok', () => 'failed')
    await vi.advanceTimersByTimeAsync(500)
    expect(await failed).toBe('failed')
    expect(onCrash).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
  it('падение воркера посреди поиска отпускает ожидание', async () => {
    const w = fakeWorker()
    const onCrash = vi.fn()
    const e = createEngine({ makeWorker: () => w, onCrash })
    const p = e.search(START, { go: { depth: 1 } })
    await e.ready
    await tick()
    w.onerror({ message: 'boom' })
    expect((await p).cancelled).toBe(true)
    expect(onCrash).toHaveBeenCalledTimes(1)
  })
  it('destroy шлёт quit и гасит воркер', async () => {
    const w = fakeWorker()
    const e = createEngine({ makeWorker: () => w })
    await e.ready
    e.destroy()
    expect(w.sent.at(-1)).toBe('quit')
    expect(w.terminated).toBe(true)
  })
})
