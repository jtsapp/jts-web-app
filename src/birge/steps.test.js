import { describe, it, expect } from 'vitest'
import { STEP_MS, checkSteps, stepStates } from './steps.js'

describe('шаги проверки (прототип: .pipe/.step)', () => {
  it('шаг фото — только когда фото есть, с их числом', () => {
    expect(checkSteps(0).map((s) => s.id)).toEqual(['dict', 'ai', 'rules'])
    const withPhoto = checkSteps(2)
    expect(withPhoto.map((s) => s.id)).toEqual(['photo', 'dict', 'ai', 'rules'])
    expect(withPhoto[0]).toEqual({ id: 'photo', key: 'birge.step.photo', vars: { n: 2 } })
  })

  it('тикают по одному; последний крутится, пока нет ответа; ответ закрывает все', () => {
    expect(STEP_MS).toBe(550)
    expect(stepStates(3, 0, false)).toEqual(['run', 'wait', 'wait'])
    expect(stepStates(3, 1, false)).toEqual(['done', 'run', 'wait'])
    expect(stepStates(3, 9, false)).toEqual(['done', 'done', 'run'])
    expect(stepStates(3, 0, true)).toEqual(['done', 'done', 'done'])
  })
})
