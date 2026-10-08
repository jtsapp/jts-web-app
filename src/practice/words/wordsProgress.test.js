// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WORDS_KEY, WORDS_PROGRESS_EVENT } from '../practiceKeys.js'

// Синк — сеть, в юните его глушим: проверяем сам прогресс, а не поход на
// сервер (он best-effort и для гостя вообще no-op).
const pushModule = vi.fn()
vi.mock('../practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const { adoptHydratedState, ownerOf, resetPracticeStores } = await import('../progressStore.js')

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
  resetPracticeStores()
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

// Ревью 08.10.2026 (#78): сервер хранит «Слова» заменой. Найденное на этом
// устройстве до ответа сервера уходило целиком и стирало найденное на другом.
describe('сведение с сервером', () => {
  const jwt = (sub) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`

  it('найденное до ответа сервера объединяется с серверным, а не заменяет его', () => {
    localStorage.setItem('jts_access_token', jwt('7'))
    markWordFound('farm', 'cow')
    expect(pushModule).not.toHaveBeenCalled()
    adoptHydratedState({ words: { scenes: { farm: { found: ['pig', 'dog'], done: true }, ocean: { found: ['fish'], done: false } } } }, ownerOf(jwt('7')))
    expect(readState()).toEqual({
      scenes: { farm: { found: ['pig', 'dog', 'cow'], done: true }, ocean: { found: ['fish'], done: false } },
    })
    expect(pushModule.mock.calls.at(-1)[1]).toEqual(readState())
  })

  it('черновик знает меньше сервера — серверное не урезается и не отправляется заново', () => {
    localStorage.setItem('jts_access_token', jwt('7'))
    localStorage.setItem(WORDS_KEY, JSON.stringify({ scenes: { farm: { found: ['pig'], done: false } } }))
    readState()
    adoptHydratedState({ words: { scenes: { farm: { found: ['pig', 'dog'], done: true } } } }, ownerOf(jwt('7')))
    expect(readState()).toEqual({ scenes: { farm: { found: ['pig', 'dog'], done: true } } })
    expect(pushModule).not.toHaveBeenCalled()
  })
})
