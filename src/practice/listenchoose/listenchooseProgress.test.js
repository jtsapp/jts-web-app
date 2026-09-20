// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LISTENCHOOSE_KEY, LISTENCHOOSE_PROGRESS_EVENT } from '../practiceKeys.js'

// Синк — сеть, в юните его глушим: проверяем сам прогресс, а не поход на
// сервер (он best-effort и для гостя вообще no-op).
const pushModule = vi.fn()
vi.mock('../practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const { readSeen, readState, writeSeen } = await import('./listenchooseProgress.js')

const EMPTY = { seen: { easy: [], medium: [], hard: [] } }

beforeEach(() => {
  localStorage.clear()
  pushModule.mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('прогресс «уже было»', () => {
  it('пустой, битый и чужой формы стейт — чистый старт, а не падение', () => {
    expect(readState()).toEqual(EMPTY)
    localStorage.setItem(LISTENCHOOSE_KEY, '{не json')
    expect(readState()).toEqual(EMPTY)
    for (const bad of ['[1]', '"x"', '{"seen":[1]}', '{"seen":{"easy":"bus-easy"}}', 'null']) {
      localStorage.setItem(LISTENCHOOSE_KEY, bad)
      expect(readState(), bad).toEqual(EMPTY)
    }
  })

  it('из сохранённого берутся только id-строки известных сложностей, без дублей', () => {
    localStorage.setItem(
      LISTENCHOOSE_KEY,
      JSON.stringify({ seen: { easy: ['a', 'a', '', 7, null, 'b'], hard: ['c'], expert: ['z'] } }),
    )
    expect(readState()).toEqual({ seen: { easy: ['a', 'b'], medium: [], hard: ['c'] } })
    expect(readSeen('easy')).toEqual(['a', 'b'])
    expect(readSeen('expert')).toEqual([])
  })

  it('writeSeen заменяет только свою сложность, шлёт синк и будит экран событием', () => {
    const woke = vi.fn()
    window.addEventListener(LISTENCHOOSE_PROGRESS_EVENT, woke)
    writeSeen('easy', ['bus-easy', 'bus-easy-1'])
    writeSeen('hard', ['art-hard-0'])
    writeSeen('easy', ['desk-easy'])
    window.removeEventListener(LISTENCHOOSE_PROGRESS_EVENT, woke)
    expect(readState()).toEqual({ seen: { easy: ['desk-easy'], medium: [], hard: ['art-hard-0'] } })
    expect(JSON.parse(localStorage.getItem(LISTENCHOOSE_KEY))).toEqual(readState())
    expect(pushModule).toHaveBeenCalledTimes(3)
    expect(pushModule).toHaveBeenLastCalledWith('listenchoose', { seen: { easy: ['desk-easy'], medium: [], hard: ['art-hard-0'] } })
    expect(woke).toHaveBeenCalledTimes(3)
  })

  it('sync: false пишет локально и будит экран, но на сервер не шлёт', () => {
    const woke = vi.fn()
    window.addEventListener(LISTENCHOOSE_PROGRESS_EVENT, woke)
    writeSeen('easy', ['bus-easy'], { sync: false })
    window.removeEventListener(LISTENCHOOSE_PROGRESS_EVENT, woke)
    expect(readSeen('easy')).toEqual(['bus-easy'])
    expect(woke).toHaveBeenCalledTimes(1)
    expect(pushModule).not.toHaveBeenCalled()
    // Следующая запись — обычная, с синком, и несёт всё накопленное.
    writeSeen('medium', ['desk-medium'])
    expect(pushModule).toHaveBeenCalledWith('listenchoose', {
      seen: { easy: ['bus-easy'], medium: ['desk-medium'], hard: [] },
    })
  })

  it('неизвестная сложность и мусор в id не пишутся', () => {
    writeSeen('expert', ['x'])
    expect(pushModule).not.toHaveBeenCalled()
    writeSeen('medium', ['a', 'a', '', 5])
    expect(readSeen('medium')).toEqual(['a'])
  })
})

describe('хранилище не пишет', () => {
  it('прогресс живёт в зеркале до перезагрузки, а после выхода из аккаунта не воскресает', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    writeSeen('easy', ['a', 'b'])
    expect(readSeen('easy')).toEqual(['a', 'b'])
    expect(pushModule).toHaveBeenCalledWith('listenchoose', { seen: { easy: ['a', 'b'], medium: [], hard: [] } })
    // Хранилище ожило и записалось — зеркало больше не нужно…
    setItem.mockRestore()
    writeSeen('medium', ['m'])
    expect(readState()).toEqual({ seen: { easy: ['a', 'b'], medium: ['m'], hard: [] } })
    // …и после clearLocalPractice (ключ стёрт) читается чистый стейт, а не зеркало.
    localStorage.removeItem(LISTENCHOOSE_KEY)
    expect(readState()).toEqual(EMPTY)
  })
})
