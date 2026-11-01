import { describe, it, expect, vi } from 'vitest'
import { createPracticeUnitCredit, parseTaskCheckedMessage, practiceUnitOf } from './practiceUnitCredit.js'

// Задания урока конструктора, перенесённые из юнита грамматики: id блока = data-tid = pg-<уровень>-<юнит>-<uuid>.
const A1_12_GAP = 'pg-a1-12-2b6f0e1c-1111-4c3a-9d1e-000000000001'
const A1_12_MC = 'pg-a1-12-2b6f0e1c-1111-4c3a-9d1e-000000000002'
const B1_7 = 'pg-b1-7-2b6f0e1c-1111-4c3a-9d1e-000000000003'
const OWN = 'bl-2b6f0e1c-1111-4c3a-9d1e-000000000004'
const PAGE = [OWN, A1_12_GAP, A1_12_MC, B1_7]

describe('practiceUnitOf', () => {
  it('уровень и юнит из tid задания «Практики»', () => {
    expect(practiceUnitOf(A1_12_GAP)).toEqual({ level: 'a1', unitId: 12 })
    expect(practiceUnitOf(B1_7)).toEqual({ level: 'b1', unitId: 7 })
  })

  it('свои задания преподавателя и задания уровней — не из «Практики»', () => {
    expect(practiceUnitOf(OWN)).toBeNull()
    expect(practiceUnitOf('pr-quiz')).toBeNull()
    expect(practiceUnitOf(undefined)).toBeNull()
  })
})

describe('parseTaskCheckedMessage', () => {
  it('сообщение моста страницы', () => {
    expect(parseTaskCheckedMessage({ source: 'jts-lesson', type: 'task-checked', tid: OWN, pageTids: PAGE }))
      .toEqual({ tid: OWN, pageTids: PAGE })
  })

  it('чужие сообщения и битые — мимо', () => {
    expect(parseTaskCheckedMessage({ source: 'jts-lesson', type: 'stage', index: 1 })).toBeNull()
    expect(parseTaskCheckedMessage({ source: 'other', type: 'task-checked', tid: OWN })).toBeNull()
    expect(parseTaskCheckedMessage({ source: 'jts-lesson', type: 'task-checked' })).toBeNull()
    expect(parseTaskCheckedMessage(null)).toBeNull()
  })

  it('страница без списка заданий — пустой список', () => {
    expect(parseTaskCheckedMessage({ source: 'jts-lesson', type: 'task-checked', tid: OWN })).toEqual({ tid: OWN, pageTids: [] })
  })
})

describe('createPracticeUnitCredit', () => {
  it('юнит засчитывается, когда проверены все его задания на странице — не раньше', () => {
    const markDone = vi.fn()
    const credit = createPracticeUnitCredit(markDone)

    credit.onChecked({ tid: A1_12_GAP, pageTids: PAGE })
    expect(markDone).not.toHaveBeenCalled()

    credit.onChecked({ tid: A1_12_MC, pageTids: PAGE })
    expect(markDone).toHaveBeenCalledOnce()
    expect(markDone).toHaveBeenCalledWith('a1', 12)
  })

  it('юниты считаются порознь: задание другого юнита чужой не закрывает', () => {
    const markDone = vi.fn()
    const credit = createPracticeUnitCredit(markDone)

    credit.onChecked({ tid: B1_7, pageTids: PAGE })
    credit.onChecked({ tid: A1_12_GAP, pageTids: PAGE })

    expect(markDone.mock.calls).toEqual([['b1', 7]])
  })

  it('повторная проверка не засчитывает юнит второй раз', () => {
    const markDone = vi.fn()
    const credit = createPracticeUnitCredit(markDone)

    credit.onChecked({ tid: B1_7, pageTids: PAGE })
    credit.onChecked({ tid: B1_7, pageTids: PAGE })

    expect(markDone).toHaveBeenCalledOnce()
  })

  it('свои задания преподавателя юнит не засчитывают и не мешают', () => {
    const markDone = vi.fn()
    const credit = createPracticeUnitCredit(markDone)

    credit.onChecked({ tid: OWN, pageTids: PAGE })

    expect(markDone).not.toHaveBeenCalled()
  })

  it('страница без списка заданий: засчитывается по самому проверенному заданию', () => {
    const markDone = vi.fn()
    createPracticeUnitCredit(markDone).onChecked({ tid: A1_12_GAP, pageTids: [] })

    expect(markDone).toHaveBeenCalledWith('a1', 12)
  })
})
