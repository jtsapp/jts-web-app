import { describe, expect, it } from 'vitest'
import { blockReason, num, reqHint } from './screening.js'

const REQ = { Kids: { minAge: 21, text: 'от 21 года' }, IELTS: { minIelts: 7, text: 'IELTS 7.0+' }, SAT: { minSat: 1450, text: 'SAT 1450+' } }

// Те же правила, что на сервере (ResumeScreener): подсказка до отправки, окончательно решает сервер.
describe('анкета кандидата: требования направлений', () => {
  it('не пускает младше общего минимума и младше требования направления', () => {
    expect(blockReason(17, null, null, ['General'], REQ, 18)).toContain('не младше 18')
    expect(blockReason(20, null, null, ['Kids'], REQ, 18)).toContain('«Kids» — возраст не младше 21')
  })
  it('для IELTS и SAT нужен собственный балл', () => {
    expect(blockReason(30, 6.5, null, ['IELTS'], REQ, 18)).toContain('IELTS 7')
    expect(blockReason(30, null, 1400, ['SAT'], REQ, 18)).toContain('SAT 1450')
    expect(blockReason(30, 7.5, 1500, ['IELTS', 'SAT'], REQ, 18)).toBe('')
  })
  it('разбирает числа как в прототипе и показывает требования', () => {
    expect(num('7,5')).toBe(7.5)
    expect(num('')).toBeNull()
    expect(reqHint(['Kids', 'General'], REQ)).toBe('Требования — Kids: от 21 года')
  })
})
