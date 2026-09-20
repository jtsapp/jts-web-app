// Сверка движка с оракулом: все ожидания в __fixtures__/oracle.json посчитал
// САМ прототип (scripts/extract-listenchoose.js). Красный тест здесь значит,
// что порт разъехался с исходником, и чинить надо порт.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildData } from './data.js'
import {
  ATTEMPTS,
  LEVELS,
  MAX_COUNT,
  answerRound,
  canAnswer,
  createRun,
  isValidRun,
  newRound,
  retryIds,
  roundOf,
  runFromIds,
  sampleQuestions,
  scoreOf,
  shuffled,
} from './engine.js'

const ROOT = path.join(__dirname, '..', '..', '..')
const JSON_DATA = JSON.parse(readFileSync(path.join(ROOT, 'public', 'practice', 'listenchoose', 'questions.json'), 'utf8'))
const DATA = buildData(JSON_DATA)
const BANK = DATA.questions
const ORACLE = JSON.parse(readFileSync(path.join(__dirname, '__fixtures__', 'oracle.json'), 'utf8'))

// Тот же mulberry32, что в экстракторе: совпадение проверяет rngProbe.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const sceneOf = (id) => DATA.byId[id].scene

describe('оракул: выборка', () => {
  it('генератор случайных чисел тот же, что у экстрактора', () => {
    const rng = mulberry32(1)
    expect([rng(), rng(), rng(), rng(), rng()]).toEqual(ORACLE.rngProbe)
  })

  it('очередь и «уже было» совпадают с прототипом на всей сетке', () => {
    expect(ORACLE.sampling.length).toBeGreaterThan(100)
    for (const c of ORACLE.sampling) {
      const label = `${c.level}/${c.count}/seen=${c.seen.length}/prev=${c.previousScene}`
      const args = { level: c.level, count: c.count, seen: c.seen, previousScene: c.previousScene }
      if (c.result.throws) {
        expect(() => sampleQuestions(BANK, args, mulberry32(c.seed)), label).toThrow(RangeError)
      } else {
        expect(sampleQuestions(BANK, args, mulberry32(c.seed)), label).toEqual(c.result)
      }
    }
  })
})

describe('выборка: инварианты', () => {
  it('без повторов, ровно count заданий и все из своей сложности', () => {
    for (const level of LEVELS) {
      for (const count of [1, 7, 20, 50]) {
        const r = sampleQuestions(BANK, { level, count }, mulberry32(count))
        expect(r.queue).toHaveLength(count)
        expect(new Set(r.queue).size).toBe(count)
        for (const id of r.queue) expect(DATA.byId[id].level).toBe(level)
      }
    }
  })

  it('соседние задания из разных сцен, пока есть выбор, и первое — не из предыдущей сцены', () => {
    const r = sampleQuestions(BANK, { level: 'medium', count: 10, previousScene: 'bus' }, mulberry32(3))
    expect(sceneOf(r.queue[0])).not.toBe('bus')
    for (let i = 1; i < r.queue.length; i++) expect(sceneOf(r.queue[i])).not.toBe(sceneOf(r.queue[i - 1]))
  })

  it('когда банк исчерпан, цикл начинается заново, а «уже было» — только текущий набор', () => {
    const all = BANK.filter((q) => q.level === 'easy').map((q) => q.id)
    const r = sampleQuestions(BANK, { level: 'easy', count: 10, seen: all }, mulberry32(9))
    expect(r.queue).toHaveLength(10)
    expect([...r.seen].sort()).toEqual([...r.queue].sort())
  })

  it('предпочитает то, чего ещё не было', () => {
    const pool = BANK.filter((q) => q.level === 'hard').map((q) => q.id)
    const seen = pool.slice(0, 40)
    const r = sampleQuestions(BANK, { level: 'hard', count: 10, seen }, mulberry32(4))
    expect(r.queue.every((id) => !seen.includes(id))).toBe(true)
  })

  it('чужие id в «уже было» игнорируются', () => {
    const r = sampleQuestions(BANK, { level: 'easy', count: 5, seen: ['нет-такого', 'hard-1'] }, mulberry32(2))
    expect(r.queue).toHaveLength(5)
    expect(r.seen).not.toContain('нет-такого')
  })

  it('плохой размер набора — RangeError', () => {
    for (const count of [0, -1, 1.5, 51, NaN, '5']) {
      expect(() => sampleQuestions(BANK, { level: 'easy', count })).toThrow(RangeError)
    }
  })
})

describe('shuffled', () => {
  it('перестановка, вход не портит, с одним генератором воспроизводима', () => {
    const src = [0, 1, 2, 3, 4, 5]
    const a = shuffled(src, mulberry32(5))
    expect([...a].sort()).toEqual(src)
    expect(src).toEqual([0, 1, 2, 3, 4, 5])
    expect(shuffled(src, mulberry32(5))).toEqual(a)
    expect(shuffled([])).toEqual([])
  })
})

// Вопрос с известным верным фото — на нём проверяем раунд.
const Q = BANK.find((q) => q.id === 'bus-easy')
const WRONG = [0, 1, 2, 3].filter((i) => i !== Q.answer)
const READY = { heard: true, imagesReady: true }

describe('раунд: две попытки', () => {
  it('новый раунд — перестановка 0–3 без ответов', () => {
    const r = newRound(mulberry32(1))
    expect([...r.order].sort()).toEqual([0, 1, 2, 3])
    expect(r).toMatchObject({ wrong: [], resolved: false, correct: false, attempts: 0 })
  })

  it('верно с первой попытки', () => {
    const r = answerRound(newRound(), Q, Q.answer)
    expect(r).toMatchObject({ resolved: true, correct: true, attempts: 1, wrong: [] })
  })

  it('ошибка, потом верно: вторая попытка, разбор ещё скрыт до неё', () => {
    const r1 = answerRound(newRound(), Q, WRONG[0])
    expect(r1).toMatchObject({ resolved: false, correct: false, attempts: 1, wrong: [WRONG[0]] })
    const r2 = answerRound(r1, Q, Q.answer)
    expect(r2).toMatchObject({ resolved: true, correct: true, attempts: 2, wrong: [WRONG[0]] })
  })

  it('две ошибки закрывают задание без очка', () => {
    const r = answerRound(answerRound(newRound(), Q, WRONG[0]), Q, WRONG[1])
    expect(r).toMatchObject({ resolved: true, correct: false, attempts: ATTEMPTS, wrong: [WRONG[0], WRONG[1]] })
  })

  it('answerRound не портит исходный раунд', () => {
    const r0 = newRound()
    answerRound(r0, Q, WRONG[0])
    expect(r0).toMatchObject({ wrong: [], attempts: 0 })
  })

  it('выбрать нельзя: не дослушано, картинки не загрузились, уже решено, эта картинка уже ошибочная', () => {
    const fresh = newRound()
    expect(canAnswer(fresh, READY, 0)).toBe(true)
    expect(canAnswer(fresh, { heard: false, imagesReady: true }, 0)).toBe(false)
    expect(canAnswer(fresh, { heard: true, imagesReady: false }, 0)).toBe(false)
    const wrong = answerRound(fresh, Q, WRONG[0])
    expect(canAnswer(wrong, READY, WRONG[0])).toBe(false)
    expect(canAnswer(wrong, READY, WRONG[1])).toBe(true)
    expect(canAnswer(answerRound(fresh, Q, Q.answer), READY, 0)).toBe(false)
  })
})

describe('roundOf', () => {
  it('отдаёт существующий раунд, а битый порядок или чужую форму заменяет новым', () => {
    const good = { order: [3, 2, 1, 0], wrong: [], resolved: false, correct: false, attempts: 0 }
    const run = { queue: ['a'], index: 0, rounds: { a: good }, complete: false }
    expect(roundOf(run, 'a')).toBe(good)
    for (const bad of [
      { order: [0, 0, 1, 2], wrong: [] },
      { order: [0, 1, 2, 9], wrong: [] },
      { order: [0, 1, 2], wrong: [] },
      { order: [0, 1, 2, 3], wrong: 'x' },
      null,
    ]) {
      const r = roundOf({ ...run, rounds: { a: bad } }, 'a', mulberry32(1))
      expect([...r.order].sort()).toEqual([0, 1, 2, 3])
      expect(r).toMatchObject({ wrong: [], resolved: false, attempts: 0 })
    }
    expect(roundOf({ ...run, rounds: {} }, 'a').attempts).toBe(0)
  })
})

describe('счёт и повтор ошибок', () => {
  const done = (correct, attempts, wrong = []) => ({ order: [0, 1, 2, 3], wrong, resolved: true, correct, attempts })
  const run = {
    queue: ['a', 'b', 'c', 'd', 'e'],
    index: 4,
    complete: true,
    rounds: {
      a: done(true, 1),
      b: done(true, 2, [1]),
      c: done(false, 2, [1, 2]),
      d: done(true, 1),
      e: { order: [0, 1, 2, 3], wrong: [], resolved: false, correct: false, attempts: 0 },
    },
  }

  it('scoreOf: с первой попытки, со второй, промахи; неразрешённые не считаются', () => {
    expect(scoreOf(run)).toEqual({ first: 2, second: 1, missed: 1 })
    expect(scoreOf({ ...run, rounds: {} })).toEqual({ first: 0, second: 0, missed: 0 })
  })

  it('retryIds: промахи и вторые попытки, в порядке набора', () => {
    expect(retryIds({ ...run, rounds: { ...run.rounds, e: done(true, 1) } })).toEqual(['b', 'c'])
  })

  it('runFromIds: убирает дубли и чужую сложность, перемешивает', () => {
    const easy = BANK.filter((q) => q.level === 'easy').slice(0, 4).map((q) => q.id)
    const hard = BANK.find((q) => q.level === 'hard').id
    const r = runFromIds(DATA, [...easy, easy[0], hard, 'нет-такого'], 'easy', mulberry32(1))
    expect([...r.queue].sort()).toEqual([...easy].sort())
    expect(r).toMatchObject({ index: 0, rounds: {}, complete: false })
  })

  it('createRun: чистый набор с первым заданием', () => {
    expect(createRun(['a', 'b'])).toEqual({ queue: ['a', 'b'], index: 0, rounds: {}, complete: false })
  })
})

describe('isValidRun', () => {
  const ids = BANK.filter((q) => q.level === 'easy')
    .slice(0, 5)
    .map((q) => q.id)
  const good = { queue: ids, index: 2, rounds: {}, complete: false }

  it('принимает набор своей сложности и отвергает битые', () => {
    expect(isValidRun(good, DATA, 'easy')).toBe(true)
    expect(isValidRun(good, DATA, 'hard')).toBe(false)
    expect(isValidRun(null, DATA, 'easy')).toBe(false)
    expect(isValidRun({ ...good, queue: [] }, DATA, 'easy')).toBe(false)
    expect(isValidRun({ ...good, queue: [...ids, ids[0]] }, DATA, 'easy')).toBe(false)
    expect(isValidRun({ ...good, queue: ['нет-такого'] }, DATA, 'easy')).toBe(false)
    expect(isValidRun({ ...good, index: 5 }, DATA, 'easy')).toBe(false)
    expect(isValidRun({ ...good, index: -1 }, DATA, 'easy')).toBe(false)
    expect(isValidRun({ ...good, index: 1.5 }, DATA, 'easy')).toBe(false)
    expect(isValidRun({ ...good, rounds: null }, DATA, 'easy')).toBe(false)
    expect(isValidRun({ ...good, rounds: [] }, DATA, 'easy')).toBe(false)
  })

  it('набор длиннее MAX_COUNT невалиден, ровно MAX_COUNT — годится', () => {
    // Синтетический банк: настоящих заданий одной сложности ровно 50.
    const fake = { byId: Object.fromEntries(Array.from({ length: MAX_COUNT + 1 }, (_, i) => [`q${i}`, { level: 'easy' }])) }
    const queue = Object.keys(fake.byId)
    expect(isValidRun({ queue, index: 0, rounds: {} }, fake, 'easy')).toBe(false)
    expect(isValidRun({ queue: queue.slice(0, MAX_COUNT), index: 0, rounds: {} }, fake, 'easy')).toBe(true)
  })
})
