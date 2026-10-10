import { describe, it, expect } from 'vitest'
import { ieltsHomeworkCards, isIeltsHomework } from './ieltsHomework.js'
import { homeworkStateKey } from './homeworkFormat.js'

const task = (over) => ({
  id: 1, date: '2026-10-08', sec: 'reading', kind: 'teacher', origin: 'teacher', mode: 'homework', minutes: 60, status: 'available',
  completionRule: 'test:RM-AC-F03', extra: { title: 'Full test 3 · Academic', testId: 'RM-AC-F03', dueDate: '2026-10-11', createdAt: '2026-10-08T10:00' },
  ...over,
})

describe('домашние задания IELTS из плана', () => {
  it('берёт только задания преподавателя с режимом «домашнее задание»', () => {
    expect(isIeltsHomework(task())).toBe(true)
    expect(isIeltsHomework(task({ mode: 'self_study' }))).toBe(false)
    expect(isIeltsHomework(task({ origin: 'programme' }))).toBe(false)
    expect(ieltsHomeworkCards({ tasks: [task(), task({ id: 2, mode: 'self_study' })] }).map((c) => c.id)).toEqual(['i-1'])
  })

  it('новые сверху; без плана — пусто', () => {
    const cards = ieltsHomeworkCards({ tasks: [task({ id: 1 }), task({ id: 2, extra: { title: 'B', createdAt: '2026-10-09T10:00' } })] })
    expect(cards.map((c) => c.id)).toEqual(['i-2', 'i-1'])
    expect(ieltsHomeworkCards(null)).toEqual([])
  })

  it('выполненное — «Выполнено», а не «Проверено»; просрочка — по сроку, а не по дню плана', () => {
    const [done] = ieltsHomeworkCards({ tasks: [task({ status: 'completed' })] })
    expect(homeworkStateKey(done)).toBe('done')
    const [open] = ieltsHomeworkCards({ tasks: [task()] })
    expect(homeworkStateKey(open, new Date(2026, 9, 11, 20))).toBe('assigned')
    expect(homeworkStateKey(open, new Date(2026, 9, 12, 1))).toBe('overdue')
  })
})
