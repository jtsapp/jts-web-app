import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from '../engine.js'
import {
  HIT_SLOW,
  INVULN,
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
  jump,
  move,
  multOf,
  needsRow,
  slide,
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

  it('верные ворота: очки, серия, скорость растёт, жизни на месте', () => {
    const s = hit(createRun(6))
    expect(s.score).toBe(10)
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

// Длины как в obstacles.js — движок их не знает, их приносит раскладка.
const LEN = { barrier: 0.6, boom: 0.4, bus: 8 }
// Препятствие в двух единицах перед бегуном (скорость на старте 10 ед./с).
const ahead = (kind, extra = {}) => ({
  ...createRun(6),
  obstacles: [{ id: 0, lane: 1, kind, len: LEN[kind], z: 2, hit: false }],
  ...extra,
})
function run(s, seconds, every = 0.1) {
  for (let t = 0; t < seconds - 1e-9; t += every) s = advance(s, every)
  return s
}

describe('позы', () => {
  it('прыжок длится 0.7 с, потом бег', () => {
    let s = jump(createRun(6))
    expect(s.pose).toBe('jump')
    s = run(s, 0.6)
    expect(s.pose).toBe('jump')
    s = advance(s, 0.1)
    expect(s.pose).toBe('run')
  })

  it('повторный прыжок в прыжке ничего не делает', () => {
    const s = advance(jump(createRun(6)), 0.3)
    expect(jump(s)).toBe(s)
  })

  it('«вниз» в прыжке — сразу подкат, «вверх» в подкате — сразу прыжок', () => {
    const s = slide(advance(jump(createRun(6)), 0.2))
    expect(s.pose).toBe('slide')
    expect(jump(s).pose).toBe('jump')
  })

  it('дорожку можно менять в прыжке', () => {
    expect(move(jump(createRun(6)), 1).lane).toBe(2)
  })

  it('после конца забега позы не меняются', () => {
    const over = { ...createRun(6), lives: 0 }
    expect(jump(over)).toBe(over)
    expect(slide(over)).toBe(over)
  })
})

describe('препятствия', () => {
  it('барьер: в беге — удар, прыжок проходит, подкат не спасает', () => {
    expect(run(ahead('barrier'), 0.6).hits).toBe(1)
    expect(run(jump(ahead('barrier')), 0.6).hits).toBe(0)
    expect(run(slide(ahead('barrier')), 0.6).hits).toBe(1)
  })

  it('шлагбаум: проходит только подкат', () => {
    expect(run(slide(ahead('boom')), 0.6).hits).toBe(0)
    expect(run(jump(ahead('boom')), 0.6).hits).toBe(1)
    expect(run(ahead('boom'), 0.6).hits).toBe(1)
  })

  it('автобус бьёт в любой позе', () => {
    expect(run(jump(ahead('bus')), 0.6).hits).toBe(1)
    expect(run(slide(ahead('bus')), 0.6).hits).toBe(1)
  })

  it('другая дорожка — мимо', () => {
    expect(run(ahead('bus', { lane: 0 }), 1.5).hits).toBe(0)
  })

  it('перестроение в полосу автобуса посреди корпуса — удар', () => {
    let s = { ...createRun(6), obstacles: [{ id: 0, lane: 0, kind: 'bus', len: 8, z: -3, hit: false }] }
    s = advance(s, 0.1)
    expect(s.hits).toBe(0)
    s = advance(move(s, -1), 0.1)
    expect(s.hits).toBe(1)
  })

  it('удар: скорость ×0.75, серия с нуля, жизни целы, lastHit для сцены', () => {
    const s = run(ahead('bus', { speedMul: 1.4, streak: 7 }), 0.4)
    expect(s.speedMul).toBeCloseTo(1.4 * HIT_SLOW)
    expect(s.streak).toBe(0)
    expect(s.lives).toBe(LIVES)
    expect(s.hits).toBe(1)
    expect(s.lastHit).toMatchObject({ n: 1, kind: 'bus', lane: 1 })
    expect(s.invuln).toBeGreaterThan(0)
  })

  it('удар не опускает скорость ниже стартовой', () => {
    expect(run(ahead('bus', { speedMul: 1.1 }), 0.4).speedMul).toBe(1)
  })

  it('удар сбрасывает позу в бег', () => {
    expect(run(jump(ahead('bus')), 0.4).pose).toBe('run')
  })

  it('неуязвимость: второй удар не засчитан, пока она идёт; после — засчитан', () => {
    const at = (z, id) => ({ id, lane: 1, kind: 'barrier', len: 0.6, z, hit: false })
    let s = { ...createRun(6), obstacles: [at(2, 0), at(6, 1), at(16, 2)] }
    s = run(s, 1)
    expect(s.hits).toBe(1)
    s = run(s, 1)
    expect(s.hits).toBe(2)
    expect(INVULN).toBeLessThan(1.4)
  })

  it('длинный кадр не проскакивает барьер', () => {
    const s = advance(ahead('barrier', { obstacles: [{ id: 0, lane: 1, kind: 'barrier', len: 0.6, z: 1, hit: false }] }), 10)
    expect(s.hits).toBe(1)
  })

  it('препятствия едут и без ряда, проехавшие выбрасываются', () => {
    let s = ahead('barrier', { lane: 0 })
    s = advance(s, 0.1)
    expect(s.row).toBeNull()
    expect(s.obstacles[0].z).toBeCloseTo(1)
    s = run(s, 1)
    expect(s.obstacles).toEqual([])
  })

  it('spawnRow кладёт раскладку за ворота ряда', () => {
    const s = spawnRow(createRun(6), ROW, [{ lane: 2, kind: 'barrier', len: 0.6, d: 15 }])
    expect(s.row.z).toBe(SPAWN)
    expect(s.obstacles).toEqual([{ id: 0, lane: 2, kind: 'barrier', len: 0.6, z: SPAWN + 15, hit: false }])
    expect(s.obstacleSeq).toBe(1)
  })
})

describe('очки', () => {
  it('множитель: ×1 до пятых подряд, ×2 с пятых, потолок ×5', () => {
    expect([0, 1, 4, 5, 9, 10, 19, 20, 100].map(multOf)).toEqual([1, 1, 1, 2, 2, 3, 4, 5, 5])
  })

  it('верные ворота: 10 × скорость до прироста × множитель после', () => {
    const s = hit({ ...createRun(6), speedMul: 1.5, streak: 4 })
    expect(s.last.points).toBe(30)
    expect(s.score).toBe(30)
  })

  it('неверные ворота очков не дают', () => {
    const s = miss(createRun(6))
    expect(s.last.points).toBe(0)
    expect(s.score).toBe(0)
  })
})
