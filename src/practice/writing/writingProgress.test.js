// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// practiceSync тянет loadToken/fetch — в юнит-тесте прогресса важен только
// факт вызова pushModule с актуальным стейтом.
vi.mock('../practiceSync.js', () => ({ pushModule: vi.fn() }))

import { pushModule } from '../practiceSync.js'
import {
  readState,
  taskState,
  markTask,
  markSeen,
  stepDone,
  genreDoneCount,
  genreProgress,
  levelProgress,
} from './writingProgress.js'
import { WRITING_KEY, WRITING_PROGRESS_EVENT } from '../practiceKeys.js'

describe('writingProgress', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('markTask сохраняет запись, taskState её возвращает', () => {
    markTask('g1', 't1', 3, 5)
    const rec = taskState('g1', 't1')
    expect(rec).toMatchObject({ done: true, correct: 3, total: 5 })
    expect(typeof rec.at).toBe('number')
    // стейт лежит под общим ключом синка
    expect(JSON.parse(localStorage.getItem(WRITING_KEY)).tasks['g1:t1'].correct).toBe(3)
  })

  it('best-of: пересдача не ухудшает сохранённый результат', () => {
    markTask('g1', 't1', 3, 5)
    markTask('g1', 't1', 1, 5)
    expect(taskState('g1', 't1').correct).toBe(3)
    markTask('g1', 't1', 5, 5)
    expect(taskState('g1', 't1').correct).toBe(5)
  })

  it('markTask синкает стейт целиком и будит слушателей события', () => {
    const heard = vi.fn()
    window.addEventListener(WRITING_PROGRESS_EVENT, heard)
    markTask('g1', 't1', 2, 4)
    expect(pushModule).toHaveBeenCalledTimes(1)
    const [module, state] = pushModule.mock.calls[0]
    expect(module).toBe('writing')
    expect(state.tasks['g1:t1']).toMatchObject({ done: true, correct: 2 })
    expect(heard).toHaveBeenCalledTimes(1)
    window.removeEventListener(WRITING_PROGRESS_EVENT, heard)
  })

  it('markSeen идемпотентна: повторный заход не перезаписывает время и не синкает', () => {
    markSeen('g1', 2)
    const first = readState().seen['g1:s2']
    expect(typeof first).toBe('number')
    markSeen('g1', 2)
    expect(readState().seen['g1:s2']).toBe(first)
    expect(pushModule).toHaveBeenCalledTimes(1)
  })

  it('stepDone: шаги 1–3 — по seen, шаги 4+ — по заданиям, пустой шаг не пройден', () => {
    const genre = {
      id: 'g1',
      tasks: [
        { id: 'a', step: 4 },
        { id: 'b', step: 4 },
        { id: 'c', step: 5 },
      ],
    }
    expect(stepDone(genre, 1)).toBe(false)
    markSeen('g1', 1)
    expect(stepDone(genre, 1)).toBe(true)

    markTask('g1', 'a', 1, 1)
    expect(stepDone(genre, 4)).toBe(false) // 'b' ещё не сделан
    markTask('g1', 'b', 1, 1)
    expect(stepDone(genre, 4)).toBe(true)

    expect(stepDone(genre, 6)).toBe(false) // заданий на шаге нет
    expect(stepDone(null, 4)).toBe(false)
  })

  it('genreDoneCount/genreProgress: доля от 11 заданий жанра', () => {
    expect(genreProgress('g1')).toBe(0)
    for (let i = 0; i < 5; i++) markTask('g1', 't' + i, 1, 1)
    markTask('g2', 'x', 1, 1) // чужой жанр не считается
    expect(genreDoneCount('g1')).toBe(5)
    expect(genreProgress('g1')).toBe(Math.round((5 / 11) * 100))
    for (let i = 5; i < 11; i++) markTask('g1', 't' + i, 1, 1)
    expect(genreProgress('g1')).toBe(100)
  })

  it('levelProgress: среднее по переданному списку жанров', () => {
    for (let i = 0; i < 11; i++) markTask('g1', 't' + i, 1, 1)
    expect(levelProgress(['g1', 'g2'])).toBe(50)
    expect(levelProgress([])).toBe(0)
    expect(levelProgress(null)).toBe(0)
  })

  it('битый JSON под ключом не роняет чтение — стейт с нуля', () => {
    localStorage.setItem(WRITING_KEY, '{не json')
    expect(readState()).toEqual({ tasks: {}, seen: {} })
    localStorage.setItem(WRITING_KEY, JSON.stringify(['массив']))
    expect(readState()).toEqual({ tasks: {}, seen: {} })
  })
})
