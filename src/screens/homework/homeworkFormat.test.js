import { describe, it, expect } from 'vitest'
import {
  fileExtension, isAllowedFile, homeworkStateKey, isOverdue,
  canAttach, canSubmit, pendingCount,
} from './homeworkFormat.js'

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
  it('до проверки можно прикладывать файлы, после — нет', () => {
    expect(canAttach(hw())).toBe(true)
    expect(canAttach(hw({ status: 'NEEDS_REVISION' }))).toBe(true)
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
