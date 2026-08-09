import { describe, it, expect } from 'vitest'
import { serializeStepProgress, parseStepProgress } from './stepProgress.js'

describe('прогресс урока из шагов', () => {
  it('переживает круг сериализации', () => {
    const json = serializeStepProgress({
      answers: { 's2-c0': 'busy', 's2-m0': { busy: 'занятой' } },
      checkedSteps: new Set(['s2']),
      stepId: 's3',
    })
    const back = parseStepProgress(json)

    expect(back.answers).toEqual({ 's2-c0': 'busy', 's2-m0': { busy: 'занятой' } })
    expect([...back.checkedSteps]).toEqual(['s2'])
    expect(back.stepId).toBe('s3')
  })

  it('пустой прогресс — валидная строка, а не пропуск', () => {
    const back = parseStepProgress(serializeStepProgress({ answers: {}, checkedSteps: new Set(), stepId: null }))
    expect(back.answers).toEqual({})
    expect(back.checkedSteps.size).toBe(0)
    expect(back.stepId).toBeNull()
  })

  // Бридж iframe'а пишет в ту же колонку массив DOM-событий. Урок каталога,
  // который вчера открывался файлом, после перерегистрации уровня откроется
  // шагами — и наткнётся на чужую форму.
  it('чужая форма читается как «прогресса нет»', () => {
    expect(parseStepProgress('[]')).toBeNull()
    expect(parseStepProgress('[{"selector":"#a","eventType":"click"}]')).toBeNull()
  })

  it('мусор и пустота не роняют разбор', () => {
    expect(parseStepProgress(null)).toBeNull()
    expect(parseStepProgress('')).toBeNull()
    expect(parseStepProgress('   ')).toBeNull()
    expect(parseStepProgress('не json')).toBeNull()
    expect(parseStepProgress('null')).toBeNull()
    expect(parseStepProgress('42')).toBeNull()
  })

  it('битые поля внутри своей формы заменяются пустыми, а не ломают урок', () => {
    const back = parseStepProgress('{"shape":"lesson-steps","answers":["не карта"],"checked":"не список"}')
    expect(back.answers).toEqual({})
    expect(back.checkedSteps.size).toBe(0)
    expect(back.stepId).toBeNull()
  })
})
