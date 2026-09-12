// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WORDS_KEY, WORDS_PROGRESS_EVENT } from '../practiceKeys.js'

// Синк — сеть, в юните его глушим: проверяем сам прогресс, а не поход на
// сервер (он best-effort и для гостя вообще no-op).
const pushModule = vi.fn()
vi.mock('../practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const {
  markSceneDone,
  markWordFound,
  readState,
  sceneProgress,
  sceneState,
  sectionDoneCount,
  sectionProgress,
} = await import('./wordsProgress.js')

beforeEach(() => {
  localStorage.clear()
  pushModule.mockClear()
})

afterEach(() => {
  localStorage.clear()
})

describe('чтение стейта', () => {
  it('пустой localStorage — чистый стейт, а не падение', () => {
    expect(readState()).toEqual({ scenes: {} })
  })

  it('битый JSON не роняет экран', () => {
    localStorage.setItem(WORDS_KEY, '{не json')
    expect(readState()).toEqual({ scenes: {} })
  })

  it('массив вместо объекта тоже отбрасывается', () => {
    localStorage.setItem(WORDS_KEY, '[1,2,3]')
    expect(readState()).toEqual({ scenes: {} })
  })
})

describe('отметка найденного слова', () => {
  it('копится между заходами, а не перезаписывается раундом', () => {
    markWordFound('farm', 'cow')
    markWordFound('farm', 'pig')
    expect(sceneState('farm').found).toEqual(['cow', 'pig'])
  })

  it('повтор идемпотентен и не будит слушателей', () => {
    const spy = vi.fn()
    window.addEventListener(WORDS_PROGRESS_EVENT, spy)
    markWordFound('farm', 'cow')
    markWordFound('farm', 'cow')
    window.removeEventListener(WORDS_PROGRESS_EVENT, spy)
    expect(sceneState('farm').found).toEqual(['cow'])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('сцены не мешаются между собой', () => {
    markWordFound('farm', 'cow')
    markWordFound('ocean', 'crab')
    expect(sceneState('farm').found).toEqual(['cow'])
    expect(sceneState('ocean').found).toEqual(['crab'])
  })

  it('пустые аргументы игнорируются', () => {
    markWordFound('', 'cow')
    markWordFound('farm', '')
    expect(readState()).toEqual({ scenes: {} })
  })

  it('стейт целиком уезжает на сервер: семантика replace', () => {
    markWordFound('farm', 'cow')
    expect(pushModule).toHaveBeenCalledWith('words', { scenes: { farm: { found: ['cow'], done: false } } })
  })
})

describe('отметка пройденной сцены', () => {
  it('не теряет уже найденные слова', () => {
    markWordFound('farm', 'cow')
    markSceneDone('farm')
    expect(sceneState('farm')).toEqual({ found: ['cow'], done: true })
  })

  it('идемпотентна', () => {
    markSceneDone('farm')
    pushModule.mockClear()
    markSceneDone('farm')
    expect(pushModule).not.toHaveBeenCalled()
  })
})

describe('счётчики каталога', () => {
  it('прогресс сцены — доля найденных слов', () => {
    markWordFound('farm', 'cow')
    markWordFound('farm', 'pig')
    expect(sceneProgress('farm', 4)).toBe(50)
  })

  it('пустой пул не делит на ноль', () => {
    expect(sceneProgress('farm', 0)).toBe(0)
  })

  it('найденных больше, чем в пуле, — потолок сто процентов', () => {
    // Пул сцены мог ужаться при переэкспорте материала, а отметки остались.
    markWordFound('farm', 'cow')
    markWordFound('farm', 'pig')
    expect(sceneProgress('farm', 1)).toBe(100)
  })

  it('пройденные сцены секции считаются по флагу done', () => {
    markSceneDone('farm')
    markWordFound('ocean', 'crab')
    expect(sectionDoneCount([{ id: 'farm' }, { id: 'ocean' }, { id: 'jungle' }])).toBe(1)
  })

  it('прогресс секции — по всем её словам, а не по сценам', () => {
    markWordFound('farm', 'cow')
    expect(sectionProgress([{ id: 'farm', count: 2 }, { id: 'ocean', count: 2 }])).toBe(25)
  })

  it('секция без сцен не делит на ноль', () => {
    expect(sectionProgress([])).toBe(0)
  })
})
