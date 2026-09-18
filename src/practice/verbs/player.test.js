// Плеер таблицы на фейковых таймерах: запись «звучит» 100 мс, дальше onended.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTablePlayer } from './player.js'

const VERBS = {
  be: { v1: 'be', v2: 'was / were', v3: 'been' },
  go: { v1: 'go', v2: 'went', v3: 'gone' },
}

function fakeClips({ fail = false } = {}) {
  const played = []
  let pending = []
  return {
    played,
    wake: vi.fn(),
    ensure: vi.fn(() => (fail ? Promise.reject(new Error('404')) : Promise.resolve())),
    play: vi.fn((key, at, onEnded) => {
      played.push(key)
      const id = setTimeout(() => onEnded && onEnded(), 100)
      pending.push(id)
      return true
    }),
    stop: vi.fn(() => {
      pending.forEach(clearTimeout)
      pending = []
    }),
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(opts) {
  const clips = fakeClips(opts)
  const states = []
  const player = createTablePlayer({ clips, pause: 1, onChange: (s) => states.push(s) })
  return { clips, player, states, last: () => states.at(-1) }
}

describe('очередь', () => {
  it('три формы подряд, варианты через «/» — обе записи, потом пауза на повтор', async () => {
    const { clips, player, last } = setup()
    player.start([VERBS.be, VERBS.go])
    expect(clips.wake).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2000)
    expect(clips.played.slice(0, 4)).toEqual(['be', 'was', 'were', 'been'])
    await vi.advanceTimersByTimeAsync(5000)
    expect(clips.played).toEqual(['be', 'was', 'were', 'been', 'go', 'went', 'gone'])
    await vi.advanceTimersByTimeAsync(5000)
    expect(last().active).toBe(false) // без повтора группы — стоп в конце
  })

  it('между глаголами — пауза на повтор, в ней статус «повтори»', async () => {
    const { player, last } = setup()
    player.start([VERBS.go, VERBS.be])
    await vi.advanceTimersByTimeAsync(1100) // три формы go и зазоры 320 мс
    expect(last()).toMatchObject({ active: true, waiting: true, index: 0 })
    await vi.advanceTimersByTimeAsync(1300)
    expect(last()).toMatchObject({ waiting: false, index: 1 })
  })

  it('повтор группы начинает сначала', async () => {
    const { clips, player } = setup()
    player.start([VERBS.go], { loop: true })
    await vi.advanceTimersByTimeAsync(4000)
    expect(clips.played.filter((k) => k === 'go').length).toBeGreaterThanOrEqual(2)
    player.stop()
  })
})

describe('управление', () => {
  it('пауза глушит и не даёт хвостам доиграть, продолжение повторяет форму', async () => {
    const { clips, player, last } = setup()
    player.start([VERBS.go])
    await vi.advanceTimersByTimeAsync(150) // go отыграл, went ждёт зазора 320 мс
    player.pauseResume()
    expect(last().paused).toBe(true)
    expect(clips.played).toEqual(['go'])
    await vi.advanceTimersByTimeAsync(3000)
    expect(clips.played).toEqual(['go']) // хвост зазора отвалился
    player.pauseResume()
    await vi.advanceTimersByTimeAsync(10)
    expect(clips.played).toEqual(['go', 'went'])
    player.stop()
  })

  it('«дальше» переходит к следующему глаголу сразу', async () => {
    const { clips, player, last } = setup()
    player.start([VERBS.go, VERBS.be])
    await vi.advanceTimersByTimeAsync(50)
    player.next()
    await vi.advanceTimersByTimeAsync(10)
    expect(last().index).toBe(1)
    expect(clips.played.at(-1)).toBe('be')
    player.stop()
  })

  it('запись не загрузилась — плеер останавливается с ошибкой', async () => {
    const { player, last } = setup({ fail: true })
    player.start([VERBS.go])
    await vi.advanceTimersByTimeAsync(10)
    expect(last()).toMatchObject({ active: false, error: true })
  })
})

it('исключение при игре — ошибка, а не вечное «Звучит»', async () => {
  const { clips, player, last } = setup()
  clips.play.mockImplementation(() => {
    throw new Error('boom')
  })
  player.start([VERBS.go])
  await vi.advanceTimersByTimeAsync(10)
  expect(last()).toMatchObject({ active: false, error: true })
})
