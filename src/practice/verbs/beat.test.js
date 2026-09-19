// Бит на фейковых часах: currentTime двигает тест, планировщик зовётся
// вручную (вместо setInterval). Проверяем то, на чём стоит ритм попытки:
// сетку шестнадцатых, границу такта, события по часам и отложенный темп.

import { describe, expect, it, vi } from 'vitest'
import { createBeat } from './beat.js'
import { fakeAudioContext } from './__fixtures__/fakeAudio.js'

function setup({ ctx = fakeAudioContext(), clock } = {}) {
  let tick = null
  const beat = createBeat({
    getContext: () => ctx,
    clock,
    setIntervalFn: (fn) => {
      tick = fn
      return 1
    },
    clearIntervalFn: () => {
      tick = null
    },
  })
  const at = (t) => {
    if (ctx) ctx.currentTime = t
    if (tick) tick()
  }
  return { beat, ctx, at, ticking: () => !!tick }
}

describe('сетка', () => {
  it('шестнадцатые идут через 15/bpm, первая — через 0.1 с после старта', () => {
    const { beat, at } = setup()
    beat.start(true, 120)
    at(1.0)
    const times = beat.visual.map((x) => +x.time.toFixed(4))
    // На 120 BPM шестнадцатая — 0.125 с; видимые шаги ≤ now уже сняты в lastStep.
    expect(beat.lastStep).toBe(7)
    expect(times).toEqual([1.1])
    expect(beat.step).toBe(9)
  })

  it('нечётные шестнадцатые отстают на 17 % (свинг), удары — на своих долях', () => {
    const { beat, ctx, at } = setup()
    beat.start(true, 120)
    at(1.0)
    const d = 0.125
    const kicks = ctx.started.filter((s) => s.kind === 'osc').map((s) => +s.at.toFixed(5))
    // b=0 — бочка в 0.1, b=7 — бочка со свингом.
    expect(kicks).toContain(0.1)
    expect(kicks).toContain(+(0.1 + 7 * d + 0.17 * d).toFixed(5))
  })

  it('граница такта — ближайший шаг, кратный 16', () => {
    const { beat, at } = setup()
    beat.start(true, 120)
    at(1.0)
    // Шаг 16 = 0.1 + 16 × 0.125.
    expect(beat.nextBar()).toBeCloseTo(2.1, 6)
  })
})

describe('события по часам', () => {
  it('срабатывают по порядку времени, когда часы дошли', () => {
    const { beat, at } = setup()
    beat.start(false, 96)
    const got = []
    beat.at(0.9, () => got.push('b'))
    beat.at(0.5, () => got.push('a'))
    at(0.6)
    expect(got).toEqual(['a'])
    at(1.0)
    expect(got).toEqual(['a', 'b'])
  })

  it('стоп снимает несработавшие события и часы', () => {
    const { beat, at, ticking } = setup()
    beat.start(true, 96)
    const fn = vi.fn()
    beat.at(0.5, fn)
    beat.stop()
    at(1.0)
    expect(fn).not.toHaveBeenCalled()
    expect(ticking()).toBe(false)
    expect(beat.running).toBe(false)
  })

  it('отложенный темп вступает только с начала такта', () => {
    const { beat, at } = setup()
    beat.onTempoApplied = vi.fn()
    beat.start(true, 120)
    at(1.0) // шаг 9
    beat.pending = 60
    at(1.9) // до шага 16 ещё не дошли
    expect(beat.bpm).toBe(120)
    at(2.2)
    expect(beat.bpm).toBe(60)
    expect(beat.onTempoApplied).toHaveBeenCalledTimes(1)
  })
})

describe('без звука', () => {
  it('нет AudioContext — бит сообщает «звук не поднялся», но часы идут', () => {
    let t = 0
    const { beat, at } = setup({ ctx: null, clock: () => t })
    beat.onError = vi.fn()
    beat.start(true, 96)
    expect(beat.onError).toHaveBeenCalledWith('audioFailed')
    const fn = vi.fn()
    beat.at(0.5, fn)
    t = 0.6
    at()
    expect(fn).toHaveBeenCalled()
  })

  it('слышимость включается с ближайшей доли, а не посреди неё', () => {
    const { beat, at } = setup()
    beat.start(false, 120)
    at(0.3)
    beat.setAudible(true)
    const last = beat.gate.gain.calls.at(-1)
    expect(last[1]).toBe(1)
    // Доля = 4 шестнадцатые: 0.1, 0.6, 1.1…; ближайшая после 0.3 — 0.6.
    expect(last[2]).toBeCloseTo(0.6, 6)
  })
})
