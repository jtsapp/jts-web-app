import { describe, it, expect } from 'vitest'
import { lessonQuestions, countLessonAnswers, answeredCount, isUnitTestType } from './lessonSubmission.js'

/**
 * Урок каталога, заданный на дом целиком: по сдаче его надо посчитать.
 *
 * Считаем по ТЕМ ЖЕ правилам, что и домашка (gradeQuestion), — иначе один и тот
 * же ответ на двух экранах получал бы разный вердикт, и ученик читал бы это как
 * поломку.
 */
const УРОК = {
  id: 314,
  title: 'Unit 1 Review Test',
  steps: [
    {
      id: 's1', order: 1, title: 'Grammar',
      blocks: [
        { type: 'info', html: '<p>Read the rule.</p>' },
        { type: 'practice', title: 'Choose', questions: [
          { id: 'q1', type: 'choice', prompt: 'He ___ ready.', options: ['is', 'are'], answer: 'is' },
          { id: 'q2', type: 'choice', prompt: 'They ___ here.', options: ['is', 'are'], answer: 'are' },
        ] },
      ],
    },
    {
      id: 's2', order: 2, title: 'Writing',
      blocks: [
        { type: 'practice', title: 'Fill in', questions: [
          { id: 'q3', type: 'gap', gapBefore: 'I ', gapAfter: ' a student.', answers: ['am'] },
        ] },
        { type: 'vocab', items: [{ word: 'season' }] },
      ],
    },
  ],
}

describe('вопросы урока', () => {
  it('собираются со всех шагов, только из practice-блоков', () => {
    expect(lessonQuestions(УРОК).map((q) => q.id)).toEqual(['q1', 'q2', 'q3'])
  })

  it('урока нет — вопросов нет, а не падение', () => {
    expect(lessonQuestions(null)).toEqual([])
    expect(lessonQuestions({ steps: [] })).toEqual([])
  })
})

describe('счёт для сдачи', () => {
  it('total — все вопросы урока, correct — верные', () => {
    expect(countLessonAnswers(УРОК, { q1: 'is', q2: 'is', q3: 'am' })).toEqual({ correct: 2, total: 3 })
  })

  /**
   * Неотвеченный вопрос — не верный. Считать total только по отвеченным значило
   * бы «ответил на один из 54 верно — 100%», и преподаватель получал бы отличный
   * процент от ученика, который теста не проходил.
   */
  it('пропущенные вопросы считаются в total и не считаются верными', () => {
    expect(countLessonAnswers(УРОК, { q1: 'is' })).toEqual({ correct: 1, total: 3 })
    expect(countLessonAnswers(УРОК, {})).toEqual({ correct: 0, total: 3 })
  })

  /**
   * Вопрос без эталона (опрос про себя, открытый пропуск) gradeQuestion
   * засчитывает по факту ответа и помечает manual. Здесь мы следуем ему, а не
   * заводим второе правило: ровно так же считает сдачу домашка
   * (HomeworkPage.handleSubmit), и расхождение двух экранов ученик прочитал бы
   * как поломку.
   */
  it('вопрос без эталона засчитывается по факту ответа — как в домашке', () => {
    const опрос = { steps: [{ id: 's1', blocks: [{ type: 'practice', questions: [
      { id: 'p1', type: 'pick', prompt: 'Как часто читаешь?', options: ['часто', 'редко'] },
    ] }] }] }
    expect(countLessonAnswers(опрос, { p1: 'часто' })).toEqual({ correct: 1, total: 1 })
    expect(countLessonAnswers(опрос, {})).toEqual({ correct: 0, total: 1 })
  })

  it('урок без вопросов даёт нулевую пару — сдавать нечего', () => {
    expect(countLessonAnswers({ steps: [{ id: 's1', blocks: [{ type: 'info', html: '<p>hi</p>' }] }] }, {}))
      .toEqual({ correct: 0, total: 0 })
  })
})

describe('сколько ученик уже ответил', () => {
  // По этому числу оживает кнопка сдачи: пустая сдача ставит «сдано» на работе,
  // в которой проверять нечего.
  it('считает попытки, а не верные ответы', () => {
    expect(answeredCount(УРОК, { q1: 'are', q3: '' })).toBe(1)
    expect(answeredCount(УРОК, { q1: 'are', q3: 'am' })).toBe(2)
    expect(answeredCount(УРОК, {})).toBe(0)
  })
})

describe('юнит-тест по типу урока каталога', () => {
  /**
   * Наш конвертер эмитит ровно два кода типа — 'rev' и 'def', и парсер бэкенда
   * раскладывает их как rev → review. Тип 'test' в карте есть, но его никто не
   * выдаёт: держим оба на случай курсов, залитых не нашим конвертером.
   */
  it('review и test — оба', () => {
    expect(isUnitTestType('review')).toBe(true)
    expect(isUnitTestType('test')).toBe(true)
  })

  // Бэкенд отдаёт имя enum'а в верхнем регистре.
  it('регистр приводится к нижнему', () => {
    expect(isUnitTestType('REVIEW')).toBe(true)
    expect(isUnitTestType('Test')).toBe(true)
  })

  it('обычный урок и пустой тип — не тест', () => {
    expect(isUnitTestType('lesson')).toBe(false)
    expect(isUnitTestType('LEADIN')).toBe(false)
    expect(isUnitTestType(null)).toBe(false)
    expect(isUnitTestType(undefined)).toBe(false)
    expect(isUnitTestType('')).toBe(false)
  })
})
