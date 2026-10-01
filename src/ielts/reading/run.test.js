import { describe, it, expect } from 'vitest'
import { flattenItems, createRun, setAnswer, moveTo, answeredCount, submitBody, examSeconds, remainingSec, formatClock, isAnswered, pausedLeftSec, resumeDraft } from './run.js'

const doc = {
  id: 'RD-AC-P1',
  texts: [{ paragraphs: [{ label: 'A', text: 'x' }] }],
  groups: [
    { type: 'matching_headings', range: [1, 2], items: [{ id: 'Q1' }, { id: 'Q2' }] },
    { type: 'multiple_choice_multi', range: [3, 4], items: [{ id: 'Q3', marks: 2 }] },
    { type: 'short_answer', range: [5, 5], items: [{ id: 'Q5' }] },
  ],
}

describe('прохождение Reading', () => {
  it('нумерует вопросы как на экзамене: choose-TWO занимает два номера', () => {
    expect(flattenItems(doc).map((x) => [x.id, x.numbers])).toEqual([['Q1', [1]], ['Q2', [2]], ['Q3', [3, 4]], ['Q5', [5]]])
  })

  it('экзамен: лимит из теста или 20 минут на текст', () => {
    expect(examSeconds(doc)).toBe(1200)
    expect(examSeconds({ ...doc, timeLimitSec: 3600 })).toBe(3600)
    const run = createRun(doc, 'exam', 0)
    expect(remainingSec(run, 61_000)).toBe(1139)
    expect(formatClock(1139)).toBe('18:59')
    expect(createRun(doc, 'practice', 0).endsAt).toBeNull()
  })

  it('время на вопрос копится, пока он открыт', () => {
    let run = createRun(doc, 'practice', 0)
    run = moveTo(run, 'Q2', 10_000)
    run = moveTo(run, 'Q1', 15_000)
    run = moveTo(run, 'Q2', 20_000)
    expect(run.questionSec).toEqual({ Q1: 15, Q2: 5 })
  })

  it('новый ответ снимает прежний вердикт «Тренировки»', () => {
    let run = createRun(doc, 'practice', 0)
    run = { ...run, checked: { Q1: { correct: false } } }
    run = setAnswer(run, 'Q1', 'ii', 1000)
    expect(run.checked.Q1).toBeUndefined()
    expect(answeredCount(run, flattenItems(doc))).toBe(1)
  })

  it('в сдачу уходят только данные ответы и общее время', () => {
    let run = createRun(doc, 'exam', 0)
    run = setAnswer(run, 'Q1', 'ii', 5000)
    run = setAnswer(run, 'Q5', '  ', 6000)
    run = setAnswer(run, 'Q3', ['A', 'C'], 7000)
    const body = submitBody(run, 70_000)
    expect(body.answers).toEqual({ Q1: 'ii', Q3: ['A', 'C'] })
    expect(body.timeSec).toBe(70)
    expect(body.mode).toBe('exam')
    expect(body.questionSec.Q3).toBe(63)
  })

  it('пустой ответ — не ответ', () => {
    expect(isAnswered('')).toBe(false)
    expect(isAnswered([])).toBe(false)
    expect(isAnswered('NG')).toBe(true)
  })

  it('часы экзамена стоят, пока тест закрыт', () => {
    const run = createRun(doc, 'exam', 0)                        // 20 минут
    const draft = { ...run, savedAt: 300_000 }                    // закрыли на 5-й минуте
    expect(pausedLeftSec(draft)).toBe(900)
    const back = resumeDraft(draft, 10_000_000)                   // вернулись через час
    expect(remainingSec(back, 10_000_000)).toBe(900)
    expect(resumeDraft({ ...createRun(doc, 'practice', 0), savedAt: 5 }, 99).endsAt).toBeNull()
  })
})
