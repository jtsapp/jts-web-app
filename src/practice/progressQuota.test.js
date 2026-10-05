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
})
