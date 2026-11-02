// «I have» вместо «I've» Луна записала в ошибку (жалоба 02.11.2026): разницу ответа и эталона считает код.
import { describe, it, expect } from 'vitest'
import { answerDiff, answerDiffNote } from './answerDiff.js'

describe('answerDiff — по словам, сокращения равны полным формам', () => {
  it('сокращение не отличие, отличие — только окончание', () => {
    expect(answerDiff('I have worked here for three month', "I've worked here for three months")).toEqual([
      { from: 'month', to: 'months' },
    ])
  })
  it("«don't» = «do not», регистр и точка не важны", () => {
    expect(answerDiff("I don't like rain", 'I do not like rain.')).toEqual([])
  })
  it('форма глагола — отличие', () => {
    expect(answerDiff('She go to school', 'She goes to school')).toEqual([{ from: 'go', to: 'goes' }])
  })
  it('пропущенное и лишнее слово', () => {
    expect(answerDiff('I like music', 'I really like music')).toEqual([{ from: '', to: 'very' }])
    expect(answerDiff('I like the music', 'I like music')).toEqual([{ from: 'the', to: '' }])
  })
})

describe('answerDiffNote — строка для модели', () => {
  const screen = (given, expected) => `Write. [поле: ученик ввёл «${given}»] \n [верный ответ по заданию: «${expected}»] `
  it('совпало по словам — «не называй ошибок»', () => {
    expect(answerDiffNote(screen('I have worked here', "I've worked here"))).toMatch(/по словам они совпадают/)
  })
  it('есть отличие — только оно', () => {
    const note = answerDiffNote(screen('I have worked here for three month', "I've worked here for three months"))
    expect(note).toContain('«month» → «months»')
    expect(note).not.toMatch(/«have»/)
  })
  it('два поля на экране — какое к какому, не знаем: null', () => {
    expect(answerDiffNote('[поле: ученик ввёл «a»] [поле: ученик ввёл «b»] [верный ответ по заданию: «a»]')).toBeNull()
  })
  it('эталона нет — null', () => {
    expect(answerDiffNote('[поле: ученик ввёл «a»]')).toBeNull()
  })
})
