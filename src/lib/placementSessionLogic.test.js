import { describe, it, expect } from 'vitest'
import { decideRun, mergeGradedAnswers } from './placementSessionLogic.js'

const at = '2026-08-31T12:00:00.000Z'
const merge = (existing, fresh, max = 5) => mergeGradedAnswers(existing, fresh, { max, at })

describe('decideRun', () => {
  it('прогонов нет — заводим новый', () => {
    expect(decideRun(null)).toEqual({ action: 'create' })
  })

  it('незаконченный прогон продолжается, а не начинается заново', () => {
    // Закрыл вкладку на середине — вернулся и дошёл; иначе «один раз» означало
    // бы «одна попытка открыть страницу».
    expect(decideRun({ token: 'run-1', finished: false, level: null }))
      .toEqual({ action: 'resume', token: 'run-1' })
  })

  it('законченный прогон закрывает тему: уровень определяется один раз', () => {
    expect(decideRun({ token: 'run-1', finished: true, level: 'A2' }))
      .toEqual({ action: 'blocked', level: 'A2' })
  })
})

describe('mergeGradedAnswers', () => {
  it('записывает новые ответы и возвращает их вердикты', () => {
    const res = merge([], [{ id: 'a', correct: 1 }, { id: 'b', correct: 0 }])

    expect(res.added).toBe(2)
    expect(res.answers).toEqual([{ id: 'a', correct: 1, at }, { id: 'b', correct: 0, at }])
    expect(res.scores).toEqual([{ id: 'a', correct: 1 }, { id: 'b', correct: 0 }])
  })

  it('повтор того же задания не проверяется заново — тот же вердикт', () => {
    // Иначе роут был бы оракулом: четыре запроса на задание и ключ известен.
    const existing = [{ id: 'a', correct: 0, at }]
    const res = merge(existing, [{ id: 'a', correct: 1 }])

    expect(res.added).toBe(0)
    expect(res.answers).toEqual(existing)
    expect(res.scores).toEqual([{ id: 'a', correct: 0 }])
  })

  it('прогон упирается в потолок и ответов больше не принимает', () => {
    const existing = Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, correct: 1, at }))
    const res = merge(existing, [{ id: 'new', correct: 1 }])

    expect(res.overflow).toBe(true)
    expect(res.answers).toEqual(existing)
    expect(res.scores).toEqual([])
  })

  it('порядок ответов в ответе совпадает с порядком запроса', () => {
    const res = merge([{ id: 'b', correct: 1, at }], [{ id: 'a', correct: 0 }, { id: 'b', correct: 0 }])

    expect(res.scores.map((s) => s.id)).toEqual(['a', 'b'])
    expect(res.scores.map((s) => s.correct)).toEqual([0, 1]) // b — из записи прогона
  })

  it('непроверяемый ответ (говорение) записывается как null и не теряется', () => {
    const res = merge([], [{ id: 'sp-01', correct: null }])

    expect(res.answers).toEqual([{ id: 'sp-01', correct: null, at }])
  })
})
