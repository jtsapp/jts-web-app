import { afterEach, describe, expect, it } from 'vitest'
import { baseModel, pickAssistantModel, teacherEffort, teacherModel } from './model.js'

const ENV = ['ASSISTANT_MODEL', 'ASSISTANT_TEACHER_MODEL', 'ASSISTANT_TEACHER_EFFORT']
afterEach(() => {
  for (const k of ENV) delete process.env[k]
})

describe('модель ответа Луны', () => {
  it('вопрос учителю — Sonnet 5.5, справка по сайту — Haiku 5.5', () => {
    expect(pickAssistantModel({ question: 'Когда нужен артикль a, а когда an?' })).toEqual({ model: 'claude-sonnet-5-5', teacher: true, effort: 'low' })
    expect(pickAssistantModel({ question: 'Переведи: «Я опоздал на автобус»' }).model).toBe('claude-sonnet-5-5')
    expect(pickAssistantModel({ question: 'Проверь: Yesterday I go to the cinema with my friends' }).model).toBe('claude-sonnet-5-5')
    // справка школы по слову (grammarRef) — тоже вопрос учителю
    expect(pickAssistantModel({ question: 'Чем отличается fun от funny?' }).model).toBe('claude-sonnet-5-5')
    for (const question of ['Что мне делать сегодня?', 'Где мои домашки?', 'What should I do today?', 'Как перенести урок?', 'Где найти раздел «Марафоны»?']) {
      expect(pickAssistantModel({ question })).toEqual({ model: 'claude-haiku-5-5', teacher: false })
    }
  })

  it('служебный ход и звонок — Haiku, даже со словами учителя', () => {
    expect(pickAssistantModel({ question: 'Объясни present perfect', service: true }).model).toBe('claude-haiku-5-5')
    expect(pickAssistantModel({ question: 'Объясни present perfect', call: true }).model).toBe('claude-haiku-5-5')
  })

  it('непроверенное задание: «объясни правило» и «проверь» — подсказка, не разбор учителя', () => {
    expect(pickAssistantModel({ question: 'Объясни это правило', unchecked: true }).model).toBe('claude-haiku-5-5')
    expect(pickAssistantModel({ question: 'Проверь: I like to read books', unchecked: true }).model).toBe('claude-haiku-5-5')
  })

  it('env откатывает без правки кода; BOM из Windows-пайпа не ломает имя', () => {
    process.env.ASSISTANT_TEACHER_MODEL = 'claude-haiku-5-5'
    expect(pickAssistantModel({ question: 'Объясни present perfect' })).toEqual({ model: 'claude-haiku-5-5', teacher: false })
    process.env.ASSISTANT_TEACHER_MODEL = '﻿claude-sonnet-5-5 '
    expect(teacherModel()).toBe('claude-sonnet-5-5')
    process.env.ASSISTANT_MODEL = '﻿claude-haiku-5-5'
    expect(baseModel()).toBe('claude-haiku-5-5')
  })

  it('effort учителя — только low | medium | high: выше Sonnet 5.5 без мышления отвечает 400', () => {
    expect(teacherEffort()).toBe('low')
    process.env.ASSISTANT_TEACHER_EFFORT = 'Medium'
    expect(teacherEffort()).toBe('medium')
    process.env.ASSISTANT_TEACHER_EFFORT = 'xhigh'
    expect(teacherEffort()).toBe('low')
  })
})
