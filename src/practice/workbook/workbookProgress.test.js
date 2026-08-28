// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// practiceSync тянет loadToken/fetch — здесь важен только факт вызова
// pushModule с актуальным стейтом.
vi.mock('../practiceSync.js', () => ({ pushModule: vi.fn() }))

import { pushModule } from '../practiceSync.js'
import {
  readState, markAct, actPassed, lessonDone, firstOpen, nextLesson, levelProgress,
  missKeys, missCount, missFor, resolveMiss, selfCheck, toggleSelfCheck, actKey,
  actRight, testScore, clearLesson,
} from './workbookProgress.js'
import { WORKBOOK_KEY, WORKBOOK_PROGRESS_EVENT } from '../practiceKeys.js'

describe('workbookProgress', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('markAct отмечает экран и синкает стейт', () => {
    markAct('a0', 1, 0, [])
    expect(actPassed('a0', 1, 0)).toBe(true)
    expect(actPassed('a0', 1, 1)).toBe(false)
    expect(pushModule).toHaveBeenCalledWith('workbook', expect.objectContaining({ prog: { 'a0:1.0': 1 } }))
  })

  it('уровни не перетирают друг друга', () => {
    markAct('a0', 1, 0, [])
    expect(actPassed('a1', 1, 0)).toBe(false)
    expect(actKey('a1', 1, 0)).toBe('a1:1.0')
  })

  it('пересдача без ошибок убирает экран из разбора', () => {
    markAct('a0', 2, 3, [0, 2])
    expect(missFor('a0', 2, 3)).toEqual([0, 2])
    markAct('a0', 2, 3, [])
    expect(missFor('a0', 2, 3)).toEqual([])
    expect(missKeys('a0')).toEqual([])
  })

  it('разбор возвращает промахи по порядку урока и экрана', () => {
    markAct('a0', 10, 1, [0])
    markAct('a0', 2, 5, [1, 3])
    markAct('a1', 1, 0, [0])
    expect(missKeys('a0')).toEqual(['a0:2.5', 'a0:10.1'])
    expect(missCount('a0')).toBe(3)
  })

  it('resolveMiss отображает остаток обратно в исходные индексы', () => {
    // На экране промахнулись по пунктам 2 и 5; в разборе показали их как 0 и 1,
    // и снова провалили только второй — в исходной нумерации это пункт 5.
    markAct('a0', 3, 0, [2, 5])
    resolveMiss('a0', 3, 0, [1])
    expect(missFor('a0', 3, 0)).toEqual([5])
    resolveMiss('a0', 3, 0, [])
    expect(missKeys('a0')).toEqual([])
  })

  it('считает пройденное по уроку и уровню', () => {
    markAct('a0', 1, 0, [])
    markAct('a0', 1, 2, [])
    expect(lessonDone('a0', 1, 4)).toBe(2)
    expect(firstOpen('a0', 1, 4)).toBe(1)
    expect(levelProgress('a0', { 1: 4, 2: 6 })).toBe(20)
  })

  it('nextLesson ведёт к первому недопройденному', () => {
    const counts = { 1: 2, 2: 2, 3: 2 }
    markAct('a0', 1, 0, [])
    markAct('a0', 1, 1, [])
    expect(nextLesson('a0', [1, 2, 3], counts)).toBe(2)
  })

  it('самопроверка переключается и переживает перечитывание', () => {
    expect(selfCheck('a0', 1, 0)).toBe(false)
    expect(toggleSelfCheck('a0', 1, 0)).toBe(true)
    expect(selfCheck('a0', 1, 0)).toBe(true)
    toggleSelfCheck('a0', 1, 0)
    expect(selfCheck('a0', 1, 0)).toBe(false)
  })

  it('битый стейт не роняет чтение', () => {
    localStorage.setItem(WORKBOOK_KEY, '{{{')
    expect(readState()).toEqual({ prog: {}, miss: {}, sc: {} })
    localStorage.setItem(WORKBOOK_KEY, '["массив вместо объекта"]')
    expect(readState()).toEqual({ prog: {}, miss: {}, sc: {} })
  })

  it('зачётный урок помнит счёт, обычный экран — только факт', () => {
    // Урок из двух экранов по три пункта: на первом два верных, на втором три.
    const lesson = {
      n: 101,
      acts: [
        { t: 'choose', items: [1, 2, 3] },
        { t: 'listen', task: { t: 'type', items: [1, 2, 3] } },
      ],
    }
    markAct('a2', 101, 0, [2], 2)
    markAct('a2', 101, 1, [], 3)
    expect(actRight('a2', 101, 0)).toBe(2)
    const score = testScore(lesson, 'a2')
    expect(score).toEqual({ got: 5, total: 6, need: 5, pass: true })

    // Обычный экран счёта не заводит: в prog у него единица.
    markAct('a2', 1, 0, [])
    expect(actRight('a2', 1, 0)).toBe(0)
  })

  it('порог зачёта — 70 %, и пересдача стирает урок целиком', () => {
    const lesson = { n: 101, acts: [{ t: 'choose', items: [1, 2, 3, 4, 5] }] }
    markAct('a2', 101, 0, [0, 1], 3)
    expect(testScore(lesson, 'a2')).toEqual({ got: 3, total: 5, need: 4, pass: false })

    clearLesson('a2', 101, 1)
    const after = readState()
    expect(after.prog['a2:101.0']).toBeUndefined()
    expect(after.miss['a2:101.0']).toBeUndefined()
    expect(testScore(lesson, 'a2')).toEqual({ got: 0, total: 5, need: 4, pass: false })
  })

  it('будит каталог событием', () => {
    const spy = vi.fn()
    window.addEventListener(WORKBOOK_PROGRESS_EVENT, spy)
    markAct('a0', 1, 0, [])
    expect(spy).toHaveBeenCalled()
    window.removeEventListener(WORKBOOK_PROGRESS_EVENT, spy)
  })
})
