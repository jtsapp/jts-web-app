import { describe, expect, it } from 'vitest'
import { cuesOf } from './cues.js'
import { advance, createRun, jump, spawnRow } from './engine.js'

const ROW = { id: 'w1', prompt: 'кот', answer: 'cat', options: ['dog', 'cat', 'sun'], correct: 1 }

// Прогон до момента, когда ряд дошёл до бегуна, кадрами по 0.05 с; звуки
// собираются так же, как их собирает экран, — парой «до/после» кадра.
function runFrames(s, frames, dt = 0.05) {
  const heard = []
  for (let i = 0; i < frames; i++) {
    const next = advance(s, dt)
    heard.push(...cuesOf(s, next))
    s = next
  }
  return { s, heard }
}

describe('cuesOf', () => {
  it('без предыдущего кадра молчит', () => {
    expect(cuesOf(null, createRun(4))).toEqual([])
  })

  it('верные ворота — correct, ровно один раз', () => {
    const s = spawnRow(createRun(4), ROW)
    const { heard } = runFrames(s, 120)
    expect(heard).toEqual(['correct'])
  })

  it('чужие ворота — wrong', () => {
    const s = { ...spawnRow(createRun(4), ROW), lane: 0 }
    const { heard } = runFrames(s, 120)
    expect(heard).toEqual(['wrong'])
  })

  it('каждая монета — свой coin', () => {
    const coins = [0, 1, 2].map((i) => ({ lane: 1, kind: 'coin', d: -50 + i * 2 }))
    const s = spawnRow(createRun(4), ROW, [], coins)
    const { heard } = runFrames(s, 120)
    expect(heard.filter((c) => c === 'coin')).toHaveLength(3)
  })

  it('две монеты в одном кадре звучат одним coin, а не двумя сразу', () => {
    const a = createRun(4)
    const b = { ...a, coins: a.coins + 2 }
    expect(cuesOf(a, b)).toEqual(['coin'])
  })

  it('молния — boost', () => {
    const s = spawnRow(createRun(4), ROW, [], [{ lane: 1, kind: 'boost', d: -50 }])
    const { heard } = runFrames(s, 120)
    expect(heard).toContain('boost')
  })

  it('удар о препятствие — crash', () => {
    const s = spawnRow(createRun(4), ROW, [{ lane: 1, kind: 'bus', len: 4, d: -50 }])
    const { heard } = runFrames(s, 120)
    expect(heard).toContain('crash')
  })

  it('перепрыгнутый барьер не звучит ударом', () => {
    let s = spawnRow(createRun(4), ROW, [{ lane: 1, kind: 'barrier', len: 0.5, d: -58 }])
    // Барьер в двух единицах перед бегуном — прыжок накрывает его с запасом.
    s = jump(s)
    const { heard } = runFrames(s, 10)
    expect(heard).not.toContain('crash')
  })

  it('препятствие, снесённое в турбо, — smash, а не crash', () => {
    const s = { ...spawnRow(createRun(4), ROW, [{ lane: 1, kind: 'bus', len: 4, d: -50 }]), boost: 100 }
    const { heard } = runFrames(s, 120)
    expect(heard).toContain('smash')
    expect(heard).not.toContain('crash')
  })

  it('уже снесённое препятствие не звучит повторно на следующих кадрах', () => {
    const a = { ...createRun(4), obstacles: [{ id: 3, lane: 1, kind: 'bus', len: 4, z: -1, hit: true, smashed: true }] }
    const b = { ...a, obstacles: [{ ...a.obstacles[0], z: -1.2 }] }
    expect(cuesOf(a, b)).toEqual([])
  })
})
