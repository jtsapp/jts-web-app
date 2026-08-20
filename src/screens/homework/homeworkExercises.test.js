// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { lessonExercises, exerciseBatches, exerciseGroups, groupBlock, hasAnswer, loadAnswers, saveAnswers, answersKey } from './homeworkExercises.js'

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

    const block = groupBlock({ key: 'gap|', instruction: exercise.instruction, exercises: [exercise] })

    expect(block.type).toBe('practice')
    expect(block.title).toBe('Listen. Choose the word you hear.')
    expect(block.questions).toEqual([exercise.question])
  })

  it('у задания без инструкции шапки нет — пустой строкой её не рисуем', () => {
    const exercise = { id: 4, title: 'I ___ coffee.', question: { id: 'q1', type: 'gap' } }

    expect(groupBlock({ key: 'gap|', instruction: '', exercises: [exercise] }).title).toBe('')
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

describe('отозванная выдача', () => {
  const q = (id) => ({ id, type: 'choice', prompt: id, options: ['a'], answer: 'a' })

  it('задания отозванной выдачи ученику не показываются', () => {
    const hw = { exercises: [
      { id: 1, batchId: 'b1', question: q('q1') },
      { id: 2, batchId: 'b2', question: q('q2'), revoked: true },
    ] }

    expect(lessonExercises(hw).map((e) => e.id)).toEqual([1])
  })

  it('отозванная выдача исчезает из списка целиком, а не наполовину', () => {
    const hw = { exercises: [
      { id: 1, batchId: 'b1', lessonTitle: 'Осталась', question: q('q1') },
      { id: 2, batchId: 'b2', lessonTitle: 'Отозвана', question: q('q2'), revoked: true },
      { id: 3, batchId: 'b2', lessonTitle: 'Отозвана', question: q('q3'), revoked: true },
    ] }

    const batches = exerciseBatches(hw)

    expect(batches).toHaveLength(1)
    expect(batches[0].lessonTitle).toBe('Осталась')
  })
})

describe('задания под общей инструкцией стоят одной карточкой', () => {
  const gap = (id, instruction) => ({
    id,
    instruction,
    question: { id: `q${id}`, type: 'gap', gapBefore: 'a', gapAfter: 'b', answers: ['x'] },
  })

  it('одинаковая инструкция собирает вопросы в одну группу', () => {
    const groups = exerciseGroups([gap(1, 'Build the word.'), gap(2, 'Build the word.'), gap(3, 'Build the word.')])

    expect(groups).toHaveLength(1)
    expect(groups[0].instruction).toBe('Build the word.')
    expect(groups[0].exercises.map((e) => e.id)).toEqual([1, 2, 3])
  })

  it('разные инструкции остаются разными карточками', () => {
    const groups = exerciseGroups([gap(1, 'Build the word.'), gap(2, 'Listen and choose.')])

    expect(groups.map((g) => g.instruction)).toEqual(['Build the word.', 'Listen and choose.'])
  })

  it('одна инструкция, но разные типы — разные карточки: разбор у них свой', () => {
    const groups = exerciseGroups([
      gap(1, 'Do the task.'),
      { id: 2, instruction: 'Do the task.', question: { id: 'q2', type: 'choice', prompt: 'A?', options: ['a'], answer: 'a' } },
    ])

    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.key)).toEqual(['gap|Do the task.', 'choice|Do the task.'])
  })

  it('задания без инструкции собираются по типу, а не рассыпаются поштучно', () => {
    const groups = exerciseGroups([gap(1, undefined), gap(2, undefined)])

    expect(groups).toHaveLength(1)
    expect(groups[0].instruction).toBe('')
  })

  it('блок группы отдаёт вопросы в исходном порядке', () => {
    const [group] = exerciseGroups([gap(1, 'Build the word.'), gap(2, 'Build the word.')])

    expect(groupBlock(group).questions.map((q) => q.id)).toEqual(['q1', 'q2'])
  })
})

describe('hasAnswer', () => {
  it('пустое не считается ответом', () => {
    expect(hasAnswer(null)).toBe(false)
    expect(hasAnswer(undefined)).toBe(false)
    expect(hasAnswer('')).toBe(false)
    expect(hasAnswer([])).toBe(false)
    expect(hasAnswer({})).toBe(false)
  })

  it('ответ любого типа задания распознаётся', () => {
    expect(hasAnswer('like')).toBe(true)
    expect(hasAnswer(['a', 'b'])).toBe(true)
    expect(hasAnswer({ cat: 'кот' })).toBe(true)
    expect(hasAnswer(0)).toBe(true)
  })
})
