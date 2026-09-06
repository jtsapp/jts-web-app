// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// practiceSync тянет loadToken/fetch — здесь важен только факт вызова
// pushModule с актуальным стейтом.
vi.mock('../practiceSync.js', () => ({ pushModule: vi.fn() }))

import { pushModule } from '../practiceSync.js'
import {
  readState,
  markExercise,
  markTextDone,
  textState,
  progressOf,
  levelProgress,
  levelDoneCount,
} from './readingProgress.js'
import { READING_KEY, READING_PROGRESS_EVENT } from '../practiceKeys.js'

const TEXT = {
  id: 'a1-sci-honey',
  exercises: [
    { type: 'tf', items: [{}, {}, {}, {}] }, // 4
    { type: 'order', items: ['a', 'b'] }, // 2
  ],
}
const OTHER = { id: 'a1-adv-snow', exercises: [{ type: 'tf', items: [{}, {}] }] } // 2

describe('readingProgress', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('пустой стейт читается без падения', () => {
    expect(readState()).toEqual({ texts: {} })
    expect(textState(TEXT.id)).toBeNull()
  })

  it('битый JSON не роняет чтение', () => {
    localStorage.setItem(READING_KEY, '{oops')
    expect(readState()).toEqual({ texts: {} })
  })

  it('markExercise пишет результат и синкает модуль', () => {
    markExercise(TEXT.id, 0, 3, 4)
    expect(textState(TEXT.id).ex[0]).toEqual({ score: 3, total: 4 })
    expect(pushModule).toHaveBeenCalledWith('reading', expect.objectContaining({
      texts: { [TEXT.id]: expect.objectContaining({ ex: { 0: { score: 3, total: 4 } } }) },
    }))
  })

  it('пересдача хуже прежней не портит результат', () => {
    markExercise(TEXT.id, 0, 4, 4)
    vi.clearAllMocks()
    markExercise(TEXT.id, 0, 1, 4)
    expect(textState(TEXT.id).ex[0]).toEqual({ score: 4, total: 4 })
    // и не будит слушателей впустую
    expect(pushModule).not.toHaveBeenCalled()
  })

  it('лучший результат перезаписывается', () => {
    markExercise(TEXT.id, 0, 1, 4)
    markExercise(TEXT.id, 0, 4, 4)
    expect(textState(TEXT.id).ex[0].score).toBe(4)
  })

  it('markTextDone идемпотентна', () => {
    markTextDone(TEXT.id)
    expect(textState(TEXT.id).done).toBe(true)
    vi.clearAllMocks()
    markTextDone(TEXT.id)
    expect(pushModule).not.toHaveBeenCalled()
  })

  it('«дочитал» не стирает уже сохранённые упражнения', () => {
    markExercise(TEXT.id, 1, 2, 2)
    markTextDone(TEXT.id)
    expect(textState(TEXT.id)).toMatchObject({ done: true, ex: { 1: { score: 2, total: 2 } } })
  })

  it('шлёт событие прогресса — по нему пересчитываются карточки каталога', () => {
    const spy = vi.fn()
    window.addEventListener(READING_PROGRESS_EVENT, spy)
    markExercise(TEXT.id, 0, 1, 4)
    expect(spy).toHaveBeenCalled()
    window.removeEventListener(READING_PROGRESS_EVENT, spy)
  })

  it('progressOf считает проценты по всем упражнениям текста', () => {
    markExercise(TEXT.id, 0, 3, 4)
    expect(progressOf(TEXT)).toEqual({ got: 3, total: 6, pct: 50 })
  })

  it('levelProgress усредняет по очкам, а не по текстам', () => {
    markExercise(TEXT.id, 0, 3, 4) // 3 из 6
    markExercise(OTHER.id, 0, 1, 2) // 1 из 2
    expect(levelProgress([TEXT, OTHER])).toBe(50) // 4 из 8
  })

  it('levelDoneCount считает только дочитанные', () => {
    markTextDone(OTHER.id)
    expect(levelDoneCount([TEXT, OTHER])).toBe(1)
  })

  it('пустой уровень не делит на ноль', () => {
    expect(levelProgress([])).toBe(0)
    expect(levelDoneCount(null)).toBe(0)
  })
})
