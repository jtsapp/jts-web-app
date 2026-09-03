import { describe, it, expect } from 'vitest'
import { assignableLessons, newBatchId, stripTags, unitToPayload } from './assignPractice.js'

const NOW = new Date('2026-09-03T12:00:00Z')
const lesson = (id, iso, status = 'SCHEDULED') => ({ lessonId: id, scheduledAt: iso, lessonStatus: status })

describe('assignableLessons', () => {
  // Задают обычно на том уроке, который идёт или только что прошёл, — он и
  // должен быть под рукой первым.
  it('ближайший урок идёт первым, прошедшие следом свежими вперёд', () => {
    const result = assignableLessons([
      lesson(1, '2026-09-01T10:00:00Z'),
      lesson(2, '2026-09-05T10:00:00Z'),
      lesson(3, '2026-09-02T10:00:00Z'),
      lesson(4, '2026-09-03T18:00:00Z'),
    ], NOW)
    expect(result.map((o) => o.lessonId)).toEqual([4, 2, 3, 1])
  })

  // Домашняя работа привязана к занятию: у отменённого её никто не увидит.
  it('отменённые уроки не предлагаются', () => {
    const result = assignableLessons([
      lesson(1, '2026-09-05T10:00:00Z', 'CANCELLED'),
      lesson(2, '2026-09-05T11:00:00Z'),
    ], NOW)
    expect(result.map((o) => o.lessonId)).toEqual([2])
  })

  it('мусор на входе не роняет список', () => {
    expect(assignableLessons(null, NOW)).toEqual([])
    expect(assignableLessons([{ lessonId: 1, scheduledAt: 'что-то' }], NOW)).toEqual([])
  })
})

describe('unitToPayload', () => {
  it('уровень в нижнем регистре, разметка из названия убрана', () => {
    expect(unitToPayload('A2', { id: 7, title: 'Present <b>Simple</b>', secName: 'Present' }))
      .toEqual({ level: 'a2', unitId: 7, title: 'Present Simple', section: 'Present' })
  })

  it('раздела может не быть', () => {
    expect(unitToPayload('b1', { id: 1, title: 'Modals' }).section).toBeNull()
  })
})

describe('newBatchId', () => {
  // Один ключ на нажатие: повтор с тем же ключом бэкенд не задваивает, а два
  // разных нажатия должны остаться двумя выдачами.
  it('на каждый вызов свой', () => {
    expect(newBatchId()).not.toBe(newBatchId())
  })
})

describe('stripTags', () => {
  it('пустое значение отдаёт пустую строку', () => {
    expect(stripTags(null)).toBe('')
    expect(stripTags(undefined)).toBe('')
  })
})
