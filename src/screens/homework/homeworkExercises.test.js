// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { lessonExercises, exerciseBatches, exerciseBlock, loadAnswers, saveAnswers, answersKey } from './homeworkExercises.js'

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

  it('в шапку карточки идёт инструкция с урока, а не формулировка вопроса', () => {
    const exercise = {
      id: 3,
      title: 'I ___ coffee.',
      instruction: 'Listen. Choose the word you hear.',
      question: { id: 'q9', type: 'gap' },
    }

    const block = exerciseBlock(exercise)

    expect(block.type).toBe('practice')
    expect(block.title).toBe('Listen. Choose the word you hear.')
    expect(block.questions).toEqual([exercise.question])
  })

  it('у задания без инструкции шапки нет — пустой строкой её не рисуем', () => {
    expect(exerciseBlock({ id: 4, title: 'I ___ coffee.', question: { id: 'q1', type: 'gap' } }).title).toBe('')
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

describe('отправки', () => {
  const q = (id) => ({ id, type: 'choice', prompt: id, options: ['a'], answer: 'a' })

  it('задания одного нажатия идут одной группой, разных — разными', () => {
    const hw = { exercises: [
      { id: 1, batchId: 'b1', addedAt: '2026-08-19T10:00:00', lessonTitle: 'Two hellos', question: q('q1') },
      { id: 2, batchId: 'b2', addedAt: '2026-08-20T10:00:00', lessonTitle: 'Coffee', question: q('q2') },
      { id: 3, batchId: 'b1', addedAt: '2026-08-19T10:00:00', lessonTitle: 'Two hellos', question: q('q3') },
    ] }

    const batches = exerciseBatches(hw)

    expect(batches).toHaveLength(2)
    expect(batches[0].exercises.map((e) => e.id)).toEqual([1, 3])
    expect(batches[0].lessonTitle).toBe('Two hellos')
  })

  it('порядок групп — по времени выдачи, чтобы список не прыгал после новой отправки', () => {
    const hw = { exercises: [
      { id: 1, batchId: 'позже', addedAt: '2026-08-20T10:00:00', question: q('q1') },
      { id: 2, batchId: 'раньше', addedAt: '2026-08-18T10:00:00', question: q('q2') },
    ] }

    expect(exerciseBatches(hw).map((b) => b.key)).toEqual(['раньше', 'позже'])
  })

  it('задания без ключа отправки собираются по уроку, а не рассыпаются по одному', () => {
    const hw = { exercises: [
      { id: 1, catalogLessonId: 7, question: q('q1') },
      { id: 2, catalogLessonId: 7, question: q('q2') },
      { id: 3, catalogLessonId: 9, question: q('q3') },
    ] }

    const batches = exerciseBatches(hw)

    expect(batches).toHaveLength(2)
    expect(batches[0].exercises).toHaveLength(2)
  })
})
