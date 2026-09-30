import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../engine.js'
import {
  LIVES,
  MAX_DT,
  ROW_GAP,
  RUN_DIFFICULTIES,
  SPAWN,
  SPEED_CAP,
  SPEED_STEP,
  advance,
  createRun,
  isOver,
  move,
  needsRow,
  spawnRow,
  speedOf,
} from './engine.js'

const ROW = { id: 7, prompt: 'кошка', answer: 'cat', options: ['dog', 'cat', 'run'], correct: 1 }

// Гоняет кадры по 0.1 с, пока текущий ряд не пройден.
function toPass(s) {
  let guard = 0
  while (s.row && guard++ < 10000) s = advance(s, 0.1)
  return s
}
const hit = (s) => toPass(spawnRow({ ...s, lane: ROW.correct }, ROW))
const miss = (s) => toPass(spawnRow({ ...s, lane: 0 }, ROW))

describe('RUN_DIFFICULTIES', () => {
  it('те же ступени, что у Speak or Die, слова и время по спеке', () => {
    expect(RUN_DIFFICULTIES.map((d) => d.key)).toEqual(DIFFICULTIES.map((d) => d.key))
    expect(RUN_DIFFICULTIES.map((d) => d.band)).toEqual(DIFFICULTIES.map((d) => d.band))
    expect(RUN_DIFFICULTIES.map((d) => d.levels)).toEqual([['A1', 'A2'], ['B1'], ['B2'], ['C1']])
    expect(RUN_DIFFICULTIES.map((d) => d.lead)).toEqual([6, 4.5, 3.5, 2.5])
  })
})

describe('забег', () => {
  it('старт: средняя дорожка, три жизни, ждёт ряд', () => {
    const s = createRun(6)
    expect(s.lane).toBe(1)
    expect(s.lives).toBe(LIVES)
    expect(needsRow(s)).toBe(true)
    expect(speedOf(s)).toBeCloseTo(SPAWN / 6)
  })

  it('ряд доезжает до бегуна ровно за время сложности', () => {
    let s = spawnRow(createRun(6), ROW)
    for (let i = 0; i < 59; i++) s = advance(s, 0.1)
    expect(s.row).not.toBeNull()
    s = advance(s, 0.1)
    expect(s.row).toBeNull()
  })

  it('верные ворота: очко, серия, скорость растёт, жизни на месте', () => {
    const s = hit(createRun(6))
    expect(s.score).toBe(1)
    expect(s.streak).toBe(1)
    expect(s.lives).toBe(LIVES)
    expect(s.speedMul).toBeCloseTo(SPEED_STEP)
    expect(s.last).toMatchObject({ hit: true, picked: 'cat', correct: 1, lane: 1, seq: 1 })
    expect(s.gap).toBe(ROW_GAP)
    expect(needsRow(s)).toBe(false)
    // Кадрами: один длинный кадр режется до MAX_DT и паузу не промотает.
    let later = s
    for (let i = 0; i < 8; i++) later = advance(later, 0.1)
    expect(needsRow(later)).toBe(true)
  })

  it('неверные ворота: минус жизнь, серия с нуля, ошибка записана', () => {
    const s = miss(hit(createRun(6)))
    expect(s.lives).toBe(LIVES - 1)
    expect(s.streak).toBe(0)
    expect(s.speedMul).toBeCloseTo(SPEED_STEP)
    expect(s.mistakes).toEqual([{ prompt: 'кошка', answer: 'cat', picked: 'dog' }])
    expect(s.last).toMatchObject({ hit: false, picked: 'dog', correct: 1, lane: 0 })
  })

  it('считается дорожка в момент прохода, а не при появлении ряда', () => {
    let s = spawnRow(createRun(6), ROW)
    for (let i = 0; i < 59; i++) s = advance(s, 0.1)
    s = advance(move(s, 1), 0.1)
    expect(s.last).toMatchObject({ hit: false, picked: 'run' })
  })

  it('дорожки упираются в края', () => {
    let s = createRun(6)
    s = move(move(s, -1), -1)
    expect(s.lane).toBe(0)
    s = move(move(move(s, 1), 1), 1)
    expect(s.lane).toBe(2)
  })

  it('третья ошибка заканчивает забег, дальше ничего не меняется', () => {
    const s = miss(miss(miss(createRun(6))))
    expect(isOver(s)).toBe(true)
    expect(needsRow(s)).toBe(false)
    expect(advance(s, 1)).toBe(s)
    expect(move(s, 1)).toBe(s)
  })

  it('скорость упирается в потолок', () => {
    let s = createRun(6)
    for (let i = 0; i < 20; i++) s = hit(advance(s, ROW_GAP))
    expect(s.speedMul).toBe(SPEED_CAP)
  })

  it('длинный кадр режется до MAX_DT: ряд не проскакивает бегуна', () => {
    const s = advance(spawnRow(createRun(6), ROW), 10)
    expect(s.row.z).toBeCloseTo(SPAWN - speedOf(s) * MAX_DT)
  })

  it('лучшая серия переживает ошибку', () => {
    const s = hit(miss(hit(hit(createRun(6)))))
    expect(s.streak).toBe(1)
    expect(s.bestStreak).toBe(2)
  })

  it('номер ряда и момент прохода — для сцены и подсказки', () => {
    let s = hit(createRun(6))
    expect(s.last.at).toBeCloseTo(6, 5)
    s = spawnRow(advance(s, ROW_GAP), ROW)
    expect(s.row.n).toBe(1)
  })
})
