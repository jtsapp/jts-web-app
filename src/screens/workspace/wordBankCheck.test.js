// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  collectCheckableGapIds,
  gradeWordBankInRoot,
  htmlHasCheckableWordBank,
  wordBankAnswersAttempted,
} from './wordBankCheck.js'

describe('wordBankCheck', () => {
  it('видит checkable HTML по data-answer на gap', () => {
    expect(htmlHasCheckableWordBank('<input class="gap" data-answer="weather">')).toBe(true)
    expect(htmlHasCheckableWordBank('<input class="gap" placeholder="x">')).toBe(false)
  })

  it('красит верные и неверные пропуски', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <input class="gap" data-answer="weather|climate" value="weather">
      <input class="gap" data-answer="45" value="90">
      <input class="gap" placeholder="open">
    `
    const score = gradeWordBankInRoot(root)
    expect(score).toEqual({ correct: 1, total: 2 })
    const gaps = root.querySelectorAll('input.gap')
    expect(gaps[0].classList.contains('is-correct')).toBe(true)
    expect(gaps[1].classList.contains('is-wrong')).toBe(true)
    expect(gaps[2].classList.contains('is-correct')).toBe(false)
  })

  it('собирает id только у пропусков с ключом', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <input class="gap" data-question-id="a-gap-0" data-answer="x" value="x">
      <input class="gap" data-question-id="a-gap-1" value="y">
    `
    expect(collectCheckableGapIds(root)).toEqual(['a-gap-0'])
  })

  it('wordBankAnswersAttempted смотрит префикс', () => {
    expect(wordBankAnswersAttempted({ 'step-1-gap-0': 'hi' }, 'step-1')).toBe(true)
    expect(wordBankAnswersAttempted({ 'step-1-gap-0': '' }, 'step-1')).toBe(false)
    expect(wordBankAnswersAttempted({ 'other-gap-0': 'hi' }, 'step-1')).toBe(false)
  })
})
