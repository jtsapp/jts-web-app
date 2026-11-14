// src/practice/chess/session.test.js
import { describe, it, expect, vi } from 'vitest'
import { createChessSession } from './session.js'

const flush = () => new Promise((r) => setTimeout(r, 0))
const uci = (s) => ({ from: s.slice(0, 2), to: s.slice(2, 4), ...(s[4] ? { promotion: s[4] } : {}) })

// Стенд: бот ходит по сценарию, время — рукой.
function rig({ script = [], rating = 800, hang = false } = {}) {
  const t = { now: 0 }
  const cues = []
  const save = vi.fn()
  const finish = vi.fn()
  const cancel = vi.fn()
  const analyse = vi.fn(async () => uci('g1f3'))
  const session = createChessSession({
    makeOpponent: () => ({
      requestMove: () => (hang ? new Promise(() => {}) : Promise.resolve(script.length ? uci(script.shift()) : null)),
      cancel,
    }),
    analyse, save, finish, getRating: () => rating,
    now: () => t.now, wallClock: () => 1000 + t.now, onCue: (c) => cues.push(c), newId: () => 'game-1',
  })
  return { session, t, cues, save, finish, cancel, analyse }
}
const snap = (r) => r.session.getSnapshot()

describe('машина партии', () => {
  it('до старта — idle', () => expect(snap(rig()).status).toBe('idle'))

  it('ученик белыми: ход, ответ бота, запись после каждого хода', async () => {
    const r = rig({ script: ['e7e5'] })
    r.session.start({ color: 'w', botRating: 800, time: 0 })
    expect(r.session.movesFrom('e2').map((m) => m.to)).toEqual(['e3', 'e4'])
    expect(r.session.playerMove('e2', 'e4')).toBe(true)
    expect(snap(r).thinking).toBe(true)
    expect(r.session.movesFrom('d2')).toEqual([])
    await flush()
    const s = snap(r)
    expect(s.moves.map((m) => m.san)).toEqual(['e4', 'e5'])
    expect(s.lastMove).toEqual({ from: 'e7', to: 'e5' })
    expect(s.thinking).toBe(false)
    expect(r.save.mock.calls.at(-1)[0]).toMatchObject({ id: 'game-1', color: 'w', pgn: expect.stringContaining('e5'), usedUndo: false })
    expect(r.cues).toEqual(['move', 'move'])
  })

  it('ученик чёрными: первым ходит бот', async () => {
    const r = rig({ script: ['e2e4'] })
    r.session.start({ color: 'b', botRating: 800, time: 0 })
    await flush()
    expect(snap(r).moves.map((m) => m.san)).toEqual(['e4'])
    expect(snap(r).turn).toBe('b')
  })

  it('чужой ход и недопустимый ход не делаются; недопустимый звучит', async () => {
    const r = rig({ hang: true })
    r.session.start({ color: 'w', botRating: 800, time: 0 })
    expect(r.session.playerMove('e2', 'e5')).toBe(false)
    expect(r.cues).toEqual(['illegal'])
    r.session.playerMove('e2', 'e4')
    expect(r.session.playerMove('d2', 'd4')).toBe(false)
  })

  it('мат: исход, рейтинговая партия, рейтинг вырос, звук победы', async () => {
    const r = rig({ script: ['f2f3', 'g2g4'] })
    r.session.start({ color: 'b', botRating: 800, time: 0 })
    await flush()
    r.session.playerMove('e7', 'e5')
    await flush()
    r.session.playerMove('d8', 'h4')
    const s = snap(r)
    expect(s.status).toBe('over')
    expect(s.outcome).toEqual({ result: '0-1', reason: 'checkmate' })
    expect(s.ratingChange).toEqual({ before: 800, after: 816, rated: true })
    expect(r.finish).toHaveBeenCalledWith(expect.objectContaining({ id: 'game-1', result: '0-1', rated: true, ratingAfter: 816, color: 'b' }))
    expect(r.save).toHaveBeenLastCalledWith(null)
    expect(r.cues.at(-1)).toBe('win')
  })

  it('возврат хода откатывает пару ходов и делает партию нерейтинговой', async () => {
    const r = rig({ script: ['e7e5'] })
    r.session.start({ color: 'w', botRating: 800, time: 0 })
    expect(snap(r).canUndo).toBe(false)
    r.session.playerMove('e2', 'e4')
    await flush()
    expect(r.session.undo()).toBe(true)
    expect(snap(r).moves).toEqual([])
    expect(snap(r).rated).toBe(false)
    expect(snap(r).turn).toBe('w')
  })

  it('возврат, пока бот думает, отменяет поиск и откатывает один ход', () => {
    const r = rig({ hang: true })
    r.session.start({ color: 'w', botRating: 800, time: 0 })
    r.session.playerMove('e2', 'e4')
    expect(r.session.undo()).toBe(true)
    expect(r.cancel).toHaveBeenCalled()
    expect(snap(r).moves).toEqual([])
    expect(snap(r).thinking).toBe(false)
  })

  it('подсказка показывает ход движка и снимает рейтинг', async () => {
    const r = rig()
    r.session.start({ color: 'w', botRating: 800, time: 0 })
    r.session.hint()
    expect(snap(r).hintPending).toBe(true)
    await flush()
    expect(snap(r).hint).toEqual({ from: 'g1', to: 'f3' })
    expect(snap(r).rated).toBe(false)
  })

  it('сдача: поражение; до первого хода в историю не идёт', async () => {
    const r = rig({ script: ['e7e5', 'd7d5'] })
    r.session.start({ color: 'w', botRating: 800, time: 0 })
    r.session.resign()
    expect(snap(r).outcome).toEqual({ result: '0-1', reason: 'resignation' })
    expect(r.finish).not.toHaveBeenCalled()

    r.session.start({ color: 'w', botRating: 800, time: 0 })
    r.session.playerMove('e2', 'e4'); await flush()
    r.session.playerMove('d2', 'd4'); await flush()
    r.session.resign()
    expect(r.finish).toHaveBeenCalledWith(expect.objectContaining({ result: '0-1', reason: 'resignation', rated: true, ratingAfter: 784 }))
    expect(r.cues.at(-1)).toBe('lose')
  })

  it('часы: идут после первого хода, флаг ученика — поражение по времени', async () => {
    const r = rig({ script: ['e7e5'] })
    r.session.start({ color: 'w', botRating: 800, time: 5 })
    r.t.now = 5000
    r.session.tick()
    expect(snap(r).clock).toEqual({ w: 300000, b: 300000 })
    r.session.playerMove('e2', 'e4')
    r.t.now = 6000
    await flush()
    expect(snap(r).clock).toEqual({ w: 300000, b: 299000 })
    r.t.now = 6000 + 291000
    r.session.tick()
    expect(r.cues).toContain('lowtime')
    r.session.tick()
    expect(r.cues.filter((c) => c === 'lowtime')).toHaveLength(1)
    r.t.now = 6000 + 300000
    r.session.tick()
    expect(snap(r).outcome).toEqual({ result: '0-1', reason: 'timeout' })
  })

  it('возврат хода возвращает и часы', async () => {
    const r = rig({ script: ['e7e5'] })
    r.session.start({ color: 'w', botRating: 800, time: 5 })
    r.session.playerMove('e2', 'e4')
    r.t.now = 4000
    await flush()
    r.t.now = 9000
    r.session.undo()
    expect(snap(r).clock).toEqual({ w: 300000, b: 300000 })
  })

  it('новая партия поверх рейтинговой недоигранной — поражение', async () => {
    const r = rig({ script: ['e7e5', 'd7d5'] })
    r.session.start({ color: 'w', botRating: 800, time: 0 })
    r.session.playerMove('e2', 'e4'); await flush()
    r.session.playerMove('d2', 'd4'); await flush()
    r.session.start({ color: 'b', botRating: 1000, time: 0 })
    expect(r.finish).toHaveBeenCalledWith(expect.objectContaining({ reason: 'abandoned', result: '0-1', rated: true }))
    expect(snap(r).status).toBe('playing')
    expect(snap(r).playerColor).toBe('b')
  })

  it('продолжение: позиция, часы и флаги на месте; бот спрошен, если его ход', async () => {
    const r = rig({ script: ['e7e5'] })
    const ok = r.session.resume({
      id: 'old', startedAt: 1, movedAt: 2, color: 'w', botRating: 1200, time: 5, pgn: '1. e4',
      clock: { w: 250000, b: 240000 }, clockLog: [{ w: 300000, b: 300000 }, { w: 250000, b: 240000 }], usedUndo: true, usedHint: false,
    })
    expect(ok).toBe(true)
    await flush()
    const s = snap(r)
    expect(s.moves.map((m) => m.san)).toEqual(['e4', 'e5'])
    expect(s.botRating).toBe(1200)
    expect(s.rated).toBe(false)
    expect(s.clock.w).toBe(250000)
  })

  it('продолжение с нечитаемой партией — отказ и очистка', () => {
    const r = rig()
    expect(r.session.resume({ id: 'x', color: 'w', botRating: 800, time: 0, pgn: '1. Zz9', clock: null, clockLog: [] })).toBe(false)
    expect(r.save).toHaveBeenLastCalledWith(null)
    expect(snap(r).status).toBe('idle')
  })

  it('сбой движка ставит партию и часы на паузу, retry спрашивает бота заново', async () => {
    const r = rig({ script: ['e7e5'] })
    r.session.start({ color: 'w', botRating: 800, time: 5 })
    r.session.engineFailed()
    expect(snap(r).engineError).toBe(true)
    expect(r.session.playerMove('e2', 'e4')).toBe(false)
    r.session.retry()
    expect(snap(r).engineError).toBe(false)
    expect(r.session.playerMove('e2', 'e4')).toBe(true)
    await flush()
    expect(snap(r).moves).toHaveLength(2)
  })

  it('подписчик получает новый снимок на каждое изменение, без изменений снимок тот же', () => {
    const r = rig({ hang: true })
    const seen = vi.fn()
    r.session.subscribe(seen)
    const before = snap(r)
    expect(snap(r)).toBe(before)
    r.session.start({ color: 'w', botRating: 800, time: 0 })
    expect(seen).toHaveBeenCalled()
    expect(snap(r)).not.toBe(before)
  })
})
