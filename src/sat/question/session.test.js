import { describe, expect, it } from 'vitest'
import {
  counts, createSession, elapsedMs, expired, finish, firstUnanswered, formatClock, goTo, remainingMs, resume,
  sameShape, sectionGroups, select, setPaused, setValue, suspend, syncWallClock, toggleMark, toggleStrike,
} from './session.js'

const QS = [
  { id: 'r1', section: 'rw' },
  { id: 'r2', section: 'rw' },
  { id: 'm1', section: 'math' },
]

describe('SAT session', () => {
  it('выбор снимает зачёркивание, зачёркивание снимает выбор', () => {
    let s = createSession({ id: 's', questions: QS, now: 0 })
    s = toggleStrike(s, 'r1', 'B')
    s = select(s, 'r1', 'B')
    expect(s.answers.r1).toMatchObject({ value: 'B', struck: [] })
    s = toggleStrike(s, 'r1', 'B')
    expect(s.answers.r1).toMatchObject({ value: null, struck: ['B'] })
    // зачёркнуть другой вариант — выбор остаётся
    s = select(s, 'r1', 'A')
    s = toggleStrike(s, 'r1', 'C')
    expect(s.answers.r1).toMatchObject({ value: 'A', struck: ['B', 'C'] })
  })

  it('счётчики и первый вопрос без ответа', () => {
    let s = createSession({ id: 's', questions: QS, now: 0 })
    s = select(s, 'r1', 'A')
    s = setValue(s, 'm1', '7/2')
    s = toggleMark(s, 'r2')
    expect(counts(s)).toEqual({ total: 3, answered: 2, unanswered: 1, marked: 1 })
    expect(firstUnanswered(s)).toBe(1)
    s = setValue(s, 'm1', '')
    expect(s.answers.m1.value).toBe(null)
  })

  it('время на вопросе копится только пока он на экране', () => {
    let s = createSession({ id: 's', questions: QS, now: 0 })
    s = goTo(s, 1, 5000)
    s = goTo(s, 0, 8000)
    expect(s.answers.r1.timeMs).toBe(5000)
    expect(s.answers.r2.timeMs).toBe(3000)
    s = setPaused(s, true, 10000)
    s = setPaused(s, false, 60000)
    s = goTo(s, 2, 61000)
    expect(s.answers.r1.timeMs).toBe(5000 + 2000 + 1000)
  })

  it('учебные часы считают только открытый экран; пауза их останавливает', () => {
    let s = createSession({ id: 's', questions: QS, now: 0 })
    expect(remainingMs(s, 1000)).toBe(null)
    s = suspend(s, 10_000) // ушёл с экрана
    expect(elapsedMs(s, 500_000)).toBe(10_000)
    s = resume(s, 500_000)
    expect(elapsedMs(s, 503_000)).toBe(13_000)
    s = setPaused(s, true, 503_000)
    expect(elapsedMs(s, 900_000)).toBe(13_000)
  })

  it('модуль пробника идёт по стене часов: закрытая вкладка время не останавливает, паузы нет', () => {
    let s = createSession({ id: 's', mode: 'exam', questions: QS, timing: { durationSec: 60, wallClock: true }, now: 0 })
    expect(s.clock.endsAt).toBe(60_000)
    s = suspend(s, 10_000)
    expect(remainingMs(s, 40_000)).toBe(20_000)
    expect(setPaused(s, true, 40_000)).toBe(s)
    expect(expired(s, 59_999)).toBe(false)
    expect(expired(s, 60_000)).toBe(true)
  })

  it('конец модуля пробника берётся у сервера, а не из черновика', () => {
    const s = createSession({ id: 's', mode: 'exam', questions: QS, timing: { durationSec: 60, wallClock: true }, now: 0 })
    const moved = syncWallClock(s, 20_000)
    expect(remainingMs(moved, 10_000)).toBe(10_000)
    expect(expired(moved, 20_000)).toBe(true)
    expect(syncWallClock(s, 61_000)).toBe(s) // секунда расхождения — задержка запроса
    const soft = createSession({ id: 's', mode: 'exam', questions: QS, timing: { durationSec: 60, soft: true }, now: 0 })
    expect(syncWallClock(soft, 5_000)).toBe(soft)
  })

  it('мягкий таймер не закрывает сессию', () => {
    const s = createSession({ id: 's', mode: 'diagnostic', questions: QS, timing: { durationSec: 10, soft: true }, now: 0 })
    expect(remainingMs(s, 20_000)).toBe(0)
    expect(expired(s, 20_000)).toBe(false)
  })

  it('finish фиксирует время и ставит отметку', () => {
    let s = createSession({ id: 's', questions: QS, now: 0 })
    s = finish(s, 4000)
    expect(s.finishedAt).toBe(4000)
    expect(s.answers.r1.timeMs).toBe(4000)
    expect(s.clock.runningSince).toBe(null)
  })

  it('группы ленты по секциям', () => {
    const s = createSession({ id: 's', questions: QS, now: 0 })
    expect(sectionGroups(s)).toEqual([
      { section: 'rw', from: 1, to: 2 },
      { section: 'math', from: 3, to: 3 },
    ])
  })

  it('часы и черновик', () => {
    expect(formatClock(760_000)).toBe('12:40')
    expect(formatClock(1)).toBe('00:01')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    const s = createSession({ id: 's', questions: QS, now: 0 })
    expect(sameShape(s, QS)).toBe(true)
    expect(sameShape(s, QS.slice(1))).toBe(false)
    expect(sameShape({ ...s, v: 2 }, QS)).toBe(false)
  })
})

describe('SAT session: «Похожее»', () => {
  it('дописанный вопрос не сбрасывает черновик, а продлевает его', async () => {
    const { appendQuestion, reconcile, timeOn } = await import('./session.js')
    let s = createSession({ id: 's', questions: QS, now: 0 })
    s = select(s, 'r1', 'B')
    const longer = [...QS, { id: 'm2', section: 'math' }]
    const r = reconcile(s, longer)
    expect(r.questions.map((q) => q.id)).toEqual(['r1', 'r2', 'm1', 'm2'])
    expect(r.answers.r1.value).toBe('B')
    expect(r.answers.m2.value).toBe(null)
    expect(reconcile(s, QS.slice(1))).toBe(null)
    expect(appendQuestion(r, { id: 'm2', section: 'math' })).toBe(r)
    // время на текущем вопросе считается до перехода
    expect(timeOn(s, 'r1', 4000)).toBe(4000)
    expect(timeOn(s, 'r2', 4000)).toBe(0)
  })
})
