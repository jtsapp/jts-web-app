// @vitest-environment jsdom
//
// Жалоба 05.10.2026: под входом localStorage забит кэшем каталогов, запись
// прогресса молча падает — отметка на экране есть, а раздел её «не помнит».
// Здесь каждый раздел «Практики» отмечает прохождение при забитом хранилище и
// обязан это прочитать обратно. Хранилище, а не сеть: гость, без токена.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { markUnitDone, isUnitDone, getDoneUnits } from './grammar/grammarProgress.js'
import { markTaskDone, isTaskDone, getListeningDone } from './listening/listeningProgress.js'
import { markSegmentDone, isSegmentDone, countLessonDone } from './shadowing/shadowingProgress.js'
import { markSituationLevelDone, readSituationsDone } from './situations/situationsProgress.js'
import { markWorkbookLevelDone, readWorkbooksDone } from './workbooks/workbooksProgress.js'
import { markAct, actPassed, lessonDone, toggleSelfCheck, selfCheck } from './workbook/workbookProgress.js'
import { markTask, markSeen, genreDoneCount, stepDone } from './writing/writingProgress.js'
import { markWordFound, markSceneDone, sceneState } from './words/wordsProgress.js'
import { toggleSaved, recordResult, savedCount, scoresFor } from './verbs/verbsProgress.js'
import { writeSeen, readSeen } from './listenchoose/listenchooseProgress.js'

function fillStorage() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError')
  })
}

beforeEach(() => {
  localStorage.clear()
  fillStorage()
})
afterEach(() => vi.restoreAllMocks())

describe('забитый localStorage не прячет пройденное', () => {
  it('грамматика', () => {
    markUnitDone('a1', 3)
    markUnitDone('a1', 4)
    expect(isUnitDone('a1', 3)).toBe(true)
    expect(getDoneUnits('a1')).toEqual(new Set([3, 4]))
  })

  it('аудирование', () => {
    markTaskDone('a1_001')
    markTaskDone('a1_002')
    expect(isTaskDone('a1_001')).toBe(true)
    expect(getListeningDone('a1').size).toBe(2)
  })

  it('шэдоуинг', () => {
    markSegmentDone('sg_000')
    markSegmentDone('sg_001')
    expect(isSegmentDone('sg_000')).toBe(true)
    expect(countLessonDone('sg')).toBe(2)
  })

  it('разговорная практика', () => {
    markSituationLevelDone('a1')
    markSituationLevelDone('b1')
    expect(readSituationsDone()).toEqual(['a1', 'b1'])
  })

  it('уровни воркбуков', () => {
    markWorkbookLevelDone('a0')
    markWorkbookLevelDone('a1')
    expect(readWorkbooksDone()).toEqual(['a0', 'a1'])
  })

  it('воркбук', () => {
    markAct('a0', 1, 0, [], null)
    markAct('a0', 1, 1, [2], null)
    toggleSelfCheck('a0', 1, 0)
    expect(actPassed('a0', 1, 0)).toBe(true)
    expect(lessonDone('a0', 1, 3)).toBe(2)
    expect(selfCheck('a0', 1, 0)).toBe(true)
  })

  it('«Письмо»', () => {
    markTask('g1', 't1', 3, 4)
    markTask('g1', 't2', 4, 4)
    markSeen('g1', 1)
    expect(genreDoneCount('g1')).toBe(2)
    expect(stepDone({ id: 'g1', tasks: [] }, 1)).toBe(true)
  })

  it('«Слова в картинках»', () => {
    markWordFound('farm', 'cow')
    markWordFound('farm', 'pig')
    markSceneDone('farm')
    expect(sceneState('farm')).toEqual({ found: ['cow', 'pig'], done: true })
  })

  it('«Неправильные глаголы»', () => {
    toggleSaved('go')
    recordResult('k', 'go', { kind: 'manual' })
    recordResult('k', 'be', { kind: 'manual' })
    expect(savedCount()).toBe(1)
    expect(Object.keys(scoresFor('k'))).toEqual(['go', 'be'])
  })

  it('«Слушай и выбирай»', () => {
    writeSeen('easy', ['a'])
    writeSeen('medium', ['b'])
    expect(readSeen('easy')).toEqual(['a'])
    expect(readSeen('medium')).toEqual(['b'])
  })
})
