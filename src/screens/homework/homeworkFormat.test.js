import { describe, it, expect } from 'vitest'
import { fileExtension, isAllowedFile, homeworkStateKey, isOverdue, canAttach, canSubmit, pendingCount, reviewOrder, studentOrder, answeredExercises } from './homeworkFormat.js'

const hw = (over = {}) => ({ id: 1, status: 'ASSIGNED', submissions: [], materials: [], ...over })

describe('файлы ответа', () => {
  it('расширение читается из имени и из ссылки', () => {
    expect(fileExtension('answer.JPG')).toBe('jpg')
    expect(fileExtension('https://files.example/hw/answer.pdf?token=abc')).toBe('pdf')
    expect(fileExtension('answer')).toBeNull()
  })

  it('принимаются только фото и PDF — то же, что и на бэкенде', () => {
    expect(isAllowedFile('скан.png')).toBe(true)
    expect(isAllowedFile('решение.jpeg')).toBe(true)
    expect(isAllowedFile('работа.pdf')).toBe(true)
    expect(isAllowedFile('работа.docx')).toBe(false)
    expect(isAllowedFile('')).toBe(false)
  })
})

describe('homeworkStateKey', () => {
  const now = new Date(2026, 7, 20, 12, 0, 0)

  it('несданная работа с прошедшим дедлайном — просрочена', () => {
    expect(homeworkStateKey(hw({ dueDate: '2026-08-18' }), now)).toBe('overdue')
  })

  // Дедлайн — это дата, а не момент: до конца дня работу ещё принимают.
  it('в день дедлайна работа ещё не просрочена', () => {
    expect(homeworkStateKey(hw({ dueDate: '2026-08-20' }), now)).toBe('assigned')
  })

  it('сданное и проверенное просроченным не считается', () => {
    expect(homeworkStateKey(hw({ status: 'SUBMITTED', dueDate: '2026-08-01' }), now)).toBe('submitted')
    expect(homeworkStateKey(hw({ status: 'COMPLETED', dueDate: '2026-08-01' }), now)).toBe('completed')
    expect(isOverdue(hw({ status: 'COMPLETED', dueDate: '2026-08-01' }), now)).toBe(false)
  })

  it('возврат на доработку — свой статус', () => {
    expect(homeworkStateKey(hw({ status: 'NEEDS_REVISION' }), now)).toBe('needsRevision')
  })
})

describe('что ученику можно делать', () => {
  it('файлы редактируются, только пока работа у ученика', () => {
    expect(canAttach(hw())).toBe(true)
    expect(canAttach(hw({ status: 'NEEDS_REVISION' }))).toBe(true)
    // Сданная работа зафиксирована — оценка встаёт под тем составом файлов,
    // который видел преподаватель (то же правило на бэкенде).
    expect(canAttach(hw({ status: 'SUBMITTED' }))).toBe(false)
    expect(canAttach(hw({ status: 'COMPLETED' }))).toBe(false)
    expect(canAttach(null)).toBe(false)
  })

  it('отправлять нечего, пока не приложен файл', () => {
    expect(canSubmit(hw())).toBe(false)
    expect(canSubmit(hw({ submissions: [{ id: 1 }] }))).toBe(true)
  })

  it('повторно отправлять уже отправленное нельзя', () => {
    expect(canSubmit(hw({ status: 'SUBMITTED', submissions: [{ id: 1 }] }))).toBe(false)
  })
})

describe('reviewOrder', () => {
  // Список преподавателя сортируется по тому, чья очередь действовать.
  it('сданные работы идут раньше заданных, проверенные — последними', () => {
    const order = ['COMPLETED', 'NEEDS_REVISION', 'ASSIGNED', 'SUBMITTED']
      .map((status) => ({ status }))
      .sort((a, b) => reviewOrder(a) - reviewOrder(b))
      .map((x) => x.status)
    expect(order).toEqual(['SUBMITTED', 'ASSIGNED', 'NEEDS_REVISION', 'COMPLETED'])
  })

  it('незнакомый статус не улетает в конец списка', () => {
    expect(reviewOrder({ status: 'WAT' })).toBe(reviewOrder({ status: 'ASSIGNED' }))
    expect(reviewOrder(null)).toBe(reviewOrder({ status: 'ASSIGNED' }))
  })
})

describe('studentOrder', () => {
  // Список ученика: сверху то, что ждёт его действий, внизу — проверенное.
  it('возврат на доработку первее заданного, проверенное — последним', () => {
    const order = ['COMPLETED', 'SUBMITTED', 'ASSIGNED', 'NEEDS_REVISION']
      .map((status) => ({ status }))
      .sort((a, b) => studentOrder(a) - studentOrder(b))
      .map((x) => x.status)
    expect(order).toEqual(['NEEDS_REVISION', 'ASSIGNED', 'SUBMITTED', 'COMPLETED'])
  })

  it('незнакомый статус читается как заданное', () => {
    expect(studentOrder({ status: 'WAT' })).toBe(studentOrder({ status: 'ASSIGNED' }))
    expect(studentOrder(null)).toBe(studentOrder({ status: 'ASSIGNED' }))
  })
})

describe('pendingCount', () => {
  it('считает только то, что ждёт ученика', () => {
    const list = [
      hw({ id: 1, status: 'ASSIGNED' }),
      hw({ id: 2, status: 'NEEDS_REVISION' }),
      hw({ id: 3, status: 'SUBMITTED' }),
      hw({ id: 4, status: 'COMPLETED' }),
    ]
    expect(pendingCount(list)).toBe(2)
    expect(pendingCount([])).toBe(0)
    expect(pendingCount(null)).toBe(0)
  })
})

// Регрессия: домашка, собранная из заданий урока, файлов не имеет вовсе.
// Условие «есть прикреплённый файл» запирало её навсегда — ученик решал всё
// подряд, а «Отправить на проверку» оставалась мёртвой.
describe('canSubmit — есть ли что сдавать', () => {
  const open = (extra) => ({ status: 'ASSIGNED', submissions: [], exercises: [], ...extra })

  it('прикреплённый файл по-прежнему даёт сдать', () => {
    expect(canSubmit(open({ submissions: [{ fileName: 'a.pdf', url: '/a' }] }))).toBe(true)
  })

  it('решённое задание урока тоже даёт сдать — файла у такой работы нет', () => {
    expect(canSubmit(open({
      exercises: [{ question: { id: 'q1' }, studentAnswer: 'is' }],
    }))).toBe(true)
  })

  it('не требует решить ВСЕ: одно неотвечаемое не должно запирать работу', () => {
    expect(canSubmit(open({
      exercises: [
        { question: { id: 'q1' }, studentAnswer: 'is' },
        { question: { id: 'q2' }, studentAnswer: null },
      ],
    }))).toBe(true)
  })

  it('ничего не сделано — сдавать нечего', () => {
    expect(canSubmit(open({ exercises: [{ question: { id: 'q1' }, studentAnswer: null }] }))).toBe(false)
    expect(canSubmit(open())).toBe(false)
  })

  it('отозванное задание не считается сделанным', () => {
    expect(canSubmit(open({
      exercises: [{ question: { id: 'q1' }, studentAnswer: 'is', revoked: true }],
    }))).toBe(false)
  })

  it('уже сданную сдать нельзя', () => {
    expect(canSubmit(open({
      status: 'SUBMITTED',
      exercises: [{ question: { id: 'q1' }, studentAnswer: 'is' }],
    }))).toBe(false)
  })
})
