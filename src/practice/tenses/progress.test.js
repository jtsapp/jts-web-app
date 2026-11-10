import { describe, expect, it } from 'vitest'
import { mergeTenses, normalize } from './progress.js'

describe('прогресс Tenses World', () => {
  it('normalize берёт только известную форму', () => {
    expect(normalize(null)).toEqual({ practice: {}, visited: {}, last: null })
    expect(
      normalize({
        practice: {
          'present-simple': { done: true, best: 9.7, total: 11 },
          final: { done: true, best: -3, total: 22 },
          'c-ps-pc': { done: false, best: 8, total: 8 },
          '<img>': { done: true, best: 1, total: 1 },
          recognise: 'x',
        },
        visited: { 'past-simple': 1, 'future-perfect-continuous': true, 'past-nope': 1, 'present-continuous': 0 },
        last: 'nope',
        lang: 'ru',
      }),
    ).toEqual({
      practice: { 'present-simple': { done: true, best: 9, total: 11 }, final: { done: true, best: 0, total: 22 } },
      visited: { 'past-simple': 1, 'future-perfect-continuous': 1 },
      last: null,
    })
  })

  it('merge двух устройств: наборы и страницы объединяются, лучший счёт — максимум, последнее время — этого устройства', () => {
    const phone = {
      practice: { recognise: { done: true, best: 14, total: 16 }, 'present-simple': { done: true, best: 6, total: 11 } },
      visited: { 'present-simple': 1 },
      last: 'present-simple',
    }
    const laptop = {
      practice: { 'present-simple': { done: true, best: 9, total: 11 }, final: { done: true, best: 20, total: 22 } },
      visited: { 'past-perfect': 1 },
      last: null,
    }
    expect(mergeTenses(phone, laptop)).toEqual({
      practice: {
        recognise: { done: true, best: 14, total: 16 },
        'present-simple': { done: true, best: 9, total: 11 },
        final: { done: true, best: 20, total: 22 },
      },
      visited: { 'present-simple': 1, 'past-perfect': 1 },
      // своего последнего времени у ноутбука нет — берём серверное
      last: 'present-simple',
    })
    expect(mergeTenses(phone, { ...laptop, last: 'past-perfect' }).last).toBe('past-perfect')
  })
})
