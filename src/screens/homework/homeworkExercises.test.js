// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { lessonExercises, exerciseBlock, loadAnswers, saveAnswers, answersKey } from './homeworkExercises.js'

describe('homeworkExercises', () => {
  beforeEach(() => localStorage.clear())

  it('берёт только упражнения со снимком вопроса', () => {
    const hw = { exercises: [
      { id: 1, taskId: 7, taskTitle: 'Из библиотеки' },
      { id: 2, question: { id: 'q1', type: 'choice', prompt: 'I ___ coffee', options: ['like'], answer: 'like' } },
    ] }

    const list = lessonExercises(hw)

    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(2)
  })

  it('не падает на работе без упражнений', () => {
    expect(lessonExercises(null)).toEqual([])
    expect(lessonExercises({})).toEqual([])
  })

  it('заворачивает вопрос в practice-блок с заголовком упражнения', () => {
    const exercise = { id: 3, title: 'I ___ coffee.', question: { id: 'q9', type: 'gap' } }

    const block = exerciseBlock(exercise)

    expect(block.type).toBe('practice')
    expect(block.title).toBe('I ___ coffee.')
    expect(block.questions).toEqual([exercise.question])
  })

  it('ответы переживают перезагрузку и не путаются между работами', () => {
    saveAnswers(11, { q1: 'like' })
    saveAnswers(12, { q1: 'love' })

    expect(loadAnswers(11)).toEqual({ q1: 'like' })
    expect(loadAnswers(12)).toEqual({ q1: 'love' })
    expect(answersKey(11)).not.toBe(answersKey(12))
  })

  it('битое хранилище отдаёт пустые ответы, а не роняет экран', () => {
    localStorage.setItem(answersKey(5), '{не json')

    expect(loadAnswers(5)).toEqual({})
  })
})
