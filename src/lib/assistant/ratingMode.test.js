// Режим ответа для журнала оценок — по вопросу (тем же разборщикам служебных ходов, что у роута чата).
import { describe, it, expect } from 'vitest'
import { answerMode } from './ratingMode.js'
import { OPENING_MARK, WAKE_MARK, stuckMark } from './opening.js'
import { eventMark } from './events.js'
import { hintMark } from './hintSteps.js'

describe('answerMode', () => {
  it('служебные ходы окна', () => {
    expect(answerMode(eventMark('day_start'))).toEqual({ mode: 'event', opening: true, event: 'day_start' })
    expect(answerMode(hintMark({ step: 1, mode: 'practice' }))).toEqual({ mode: 'hint', opening: true, event: null })
    expect(answerMode(stuckMark('idle'))).toEqual({ mode: 'hint', opening: true, event: null })
    expect(answerMode(OPENING_MARK)).toEqual({ mode: 'site', opening: true, event: null })
    expect(answerMode(WAKE_MARK)).toEqual({ mode: 'site', opening: true, event: null })
  })

  it('вопрос об английском — учитель, о сайте — сайт', () => {
    expect(answerMode('Когда ставить Present Perfect?').mode).toBe('teacher')
    expect(answerMode('Переведи: я устал').mode).toBe('teacher')
    expect(answerMode('Где моя домашка?')).toEqual({ mode: 'site', opening: false, event: null })
  })
})
