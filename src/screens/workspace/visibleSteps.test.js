import { describe, it, expect } from 'vitest'
import { visibleSteps } from './visibleSteps.js'

describe('какие шаги урока видит ученик', () => {
  const steps = [{ id: 'ex1' }, { id: 'ex2' }, { id: 'ex3' }]

  it('без скрытых отдаёт исходный массив, а не копию', () => {
    // Тот же массив — иначе useMemo ниже по коду пересоздавал бы список на каждый
    // рендер и обнулял мемоизацию статусов шагов.
    expect(visibleSteps(steps, [])).toBe(steps)
    expect(visibleSteps(steps, null)).toBe(steps)
  })

  it('выкидывает только перечисленные упражнения', () => {
    expect(visibleSteps(steps, ['ex2']).map((s) => s.id)).toEqual(['ex1', 'ex3'])
  })

  // Регрессия: id шага — строка, но через JSON и обратно в списке скрытых мог
  // оказаться числом, и шаг тихо не скрывался бы.
  it('сравнивает id как строки', () => {
    expect(visibleSteps([{ id: 1 }, { id: 2 }], [2]).map((s) => s.id)).toEqual([1])
    expect(visibleSteps([{ id: '2' }], [2])).toEqual([])
  })

  it('скрыты все — пустой список, а не исходный', () => {
    expect(visibleSteps(steps, ['ex1', 'ex2', 'ex3'])).toEqual([])
  })

  it('урок ещё не загружен — пустой список без падения', () => {
    expect(visibleSteps(null, ['ex1'])).toEqual([])
  })
})
