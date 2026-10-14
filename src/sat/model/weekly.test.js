import { describe, it, expect } from 'vitest'
import {
  WEEKLY_MINUTES, answersPayload, cardState, domainRows, draftKey, minutesOf, missedSkills, pastWeeks, resultRows,
  sectionCounts, submitBody, unansweredCount, weekRange,
} from './weekly.js'

const Q = [
  { id: 'q1', section: 'rw', skillId: 'rw.cs.words' },
  { id: 'q2', section: 'math', skillId: 'm.alg.linear' },
  { id: 'q3', section: 'math', skillId: 'm.adv.functions' },
]

describe('недельный тест: карточка и экран старта', () => {
  it('неделя — понедельник и воскресенье', () => {
    const r = weekRange('2026-10-12')
    expect(r.from.toISOString().slice(0, 10)).toBe('2026-10-12')
    expect(r.to.toISOString().slice(0, 10)).toBe('2026-10-18')
    expect(weekRange(null)).toBeNull()
  })

  it('минуты-ориентир — из ответа сервера, иначе 20', () => {
    expect(minutesOf({ timeLimitSeconds: 1200 })).toBe(20)
    expect(minutesOf({ timeLimitSeconds: 900 })).toBe(15)
    expect(minutesOf({})).toBe(WEEKLY_MINUTES)
    expect(minutesOf(null)).toBe(20)
  })

  it('состояние карточки: пусто, готов, начат, сдан', () => {
    expect(cardState(null)).toBe('empty')
    expect(cardState({ status: 'READY', questions: [] })).toBe('empty')
    expect(cardState({ status: 'READY', questions: Q })).toBe('ready')
    expect(cardState({ status: 'READY', questions: Q }, true)).toBe('inProgress')
    expect(cardState({ status: 'DONE', questions: Q, result: { correct: 1, total: 3 } }, true)).toBe('done')
    // сданная неделя, у которой сервер не вернул вопросы, всё равно «сдан»
    expect(cardState({ status: 'DONE', questions: [], result: { correct: 1, total: 3 } })).toBe('done')
  })

  it('черновик — один на неделю', () => {
    expect(draftKey('2026-10-12')).toBe('weekly-2026-10-12')
  })

  it('секции считает по вопросам', () => {
    expect(sectionCounts(Q)).toEqual({ rw: 1, math: 2 })
    expect(sectionCounts()).toEqual({ rw: 0, math: 0 })
  })

  it('прошлые недели: сданные, новые первыми, без текущей, не больше шести', () => {
    const h = [
      { weekStart: '2026-09-28', correct: 9, total: 15, completedAt: 'x' },
      { weekStart: '2026-10-12', correct: 10, total: 15, completedAt: 'x' },
      { weekStart: '2026-10-05', correct: 11, total: 15, completedAt: 'x' },
      { weekStart: '2026-09-21', correct: 8, total: 15, completedAt: null },
    ]
    expect(pastWeeks(h, '2026-10-12').map((x) => x.weekStart)).toEqual(['2026-10-05', '2026-09-28'])
    const many = Array.from({ length: 9 }, (_, i) => ({ weekStart: `2026-0${i + 1}-01`, completedAt: 'x' }))
    expect(pastWeeks(many, null)).toHaveLength(6)
  })
})

describe('недельный тест: сдача', () => {
  const session = {
    questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
    answers: { q1: { value: 'B', timeMs: 1000 }, q2: { value: '  ', timeMs: 500 }, q3: { value: null, timeMs: 0 } },
  }

  it('все вопросы по порядку, пустой ответ — null, время — мс', () => {
    const p = answersPayload(session, (id) => ({ q1: 61234.4, q2: 2000, q3: 0 })[id])
    expect(p).toEqual([
      { questionId: 'q1', answer: 'B', timeSpentMs: 61234 },
      { questionId: 'q2', answer: null, timeSpentMs: 2000 },
      { questionId: 'q3', answer: null, timeSpentMs: 0 },
    ])
    expect(unansweredCount(p)).toBe(2)
  })

  it('без функции времени берёт timeMs черновика', () => {
    expect(answersPayload(session).map((x) => x.timeSpentMs)).toEqual([1000, 500, 0])
  })

  it('тело сдачи несёт неделю и общее время в секундах', () => {
    expect(submitBody('2026-10-12', [], 754.6)).toEqual({ weekStart: '2026-10-12', answers: [], elapsedSeconds: 755 })
  })
})

describe('недельный тест: результат', () => {
  const result = {
    correct: 1,
    total: 3,
    items: [
      { questionId: 'q2', answer: '4', correct: true, correctAnswer: '4', skillId: 'm.alg.linear' },
      { questionId: 'q1', answer: 'A', correct: false, correctAnswer: 'B', skillId: 'rw.cs.words' },
      { questionId: 'q3', answer: null, correct: false, correctAnswer: '7', skillId: 'm.adv.functions' },
      { questionId: 'gone', answer: 'C', correct: false, correctAnswer: 'D', skillId: 'rw' },
    ],
    byDomain: [
      { domain: 'm.alg', section: 'math', correct: 1, total: 1 },
      { domain: 'm.adv', section: 'math', correct: 0, total: 1 },
      { domain: 'rw.cs', section: 'rw', correct: 0, total: 1 },
    ],
  }

  it('строки идут в порядке набора, вопрос без пары в наборе — в конце', () => {
    const rows = resultRows(result, Q)
    expect(rows.map((r) => r.item.questionId)).toEqual(['q1', 'q2', 'q3', 'gone'])
    expect(rows.map((r) => r.status)).toEqual(['wrong', 'right', 'skipped', 'wrong'])
    expect(rows[3].q).toBeNull()
    expect(resultRows(null, Q)).toEqual([])
  })

  it('навыки для «Потренировать»: только ошибки, без повторов и без секций-заглушек', () => {
    expect(missedSkills(result)).toEqual(['rw.cs.words', 'm.adv.functions'])
  })

  it('домены: R&W первым, внутри секции слабые выше', () => {
    expect(domainRows(result).map((d) => [d.domain, d.pct])).toEqual([['rw.cs', 0], ['m.adv', 0], ['m.alg', 100]])
  })
})
