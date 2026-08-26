import { describe, it, expect } from 'vitest'
import { visibleSteps, hiddenBlockKey, hiddenBlockKeys } from './visibleSteps.js'

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
    // Маршрут ученика короче на один шаг; материал раздела при этом остаётся.
    expect(visibleSteps(steps, ['ex2'])).toHaveLength(steps.length - 1)
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

  // Список скрытого один на шаги и на отдельные карточки. Ключ карточки не должен
  // выглядеть для этого фильтра шагом — иначе скрытие одного упражнения снесло бы
  // с урока шаг целиком (или, наоборот, промолчало).
  it('ключ отдельной карточки не считается шагом', () => {
    expect(visibleSteps(steps, [hiddenBlockKey('ex2', 0)]).map((s) => s.id)).toEqual(['ex1', 'ex2', 'ex3'])
  })
})

describe('какие карточки шага видит ученик', () => {
  it('ключ собирается из шага и позиции блока', () => {
    expect(hiddenBlockKey('ex2', 3)).toBe('block@ex2:3')
  })

  it('две карточки одного шага различимы', () => {
    const hidden = hiddenBlockKeys([hiddenBlockKey('ex2', 0)])

    expect(hidden.has(hiddenBlockKey('ex2', 0))).toBe(true)
    expect(hidden.has(hiddenBlockKey('ex2', 1))).toBe(false)
    // Одинаковая позиция в другом шаге — другая карточка.
    expect(hidden.has(hiddenBlockKey('ex3', 0))).toBe(false)
  })

  it('скрытые шаги в множество карточек не попадают', () => {
    expect(hiddenBlockKeys(['ex2']).size).toBe(0)
  })

  // Пустой случай отдаёт одну и ту же ссылку: новое множество на каждый рендер
  // обнуляло бы useMemo у вызывающего.
  it('скрывать нечего — одна и та же ссылка', () => {
    expect(hiddenBlockKeys([])).toBe(hiddenBlockKeys(null))
    expect(hiddenBlockKeys(['ex2'])).toBe(hiddenBlockKeys([]))
  })
})
