import { describe, it, expect } from 'vitest'
import { numberToRu, spellNumbersRu } from './numbersRu.js'

describe('numberToRu', () => {
  it('числа словами', () => {
    expect(numberToRu(0)).toBe('ноль')
    expect(numberToRu(7)).toBe('семь')
    expect(numberToRu(15)).toBe('пятнадцать')
    expect(numberToRu(20)).toBe('двадцать')
    expect(numberToRu(42)).toBe('сорок два')
    expect(numberToRu(100)).toBe('сто')
    expect(numberToRu(305)).toBe('триста пять')
    expect(numberToRu(1000)).toBe('одна тысяча')
    expect(numberToRu(2024)).toBe('две тысячи двадцать четыре')
    expect(numberToRu(11000)).toBe('одиннадцать тысяч')
    expect(numberToRu(150000)).toBe('сто пятьдесят тысяч')
    expect(numberToRu(1_000_000)).toBe('один миллион')
    expect(numberToRu(3_200_000)).toBe('три миллиона двести тысяч')
  })
})

// Голос Луны — Gemini с языком en-US, как в её звонке. Цифры он читает
// по-английски («0%» — «zero percent»), поэтому русская фраза идёт в синтез
// с числами словами.
describe('spellNumbersRu', () => {
  it('проценты — со склонением', () => {
    expect(spellNumbersRu('У вас там 0%, а в письме 20%.')).toBe('У вас там ноль процентов, а в письме двадцать процентов.')
    expect(spellNumbersRu('прогресс 1% и 3 %')).toBe('прогресс один процент и три процента')
    expect(spellNumbersRu('21% и 11%')).toBe('двадцать один процент и одиннадцать процентов')
  })

  it('обычные числа и дробные', () => {
    expect(spellNumbersRu('Осталось 15 минут, балл 6.5 и 7,5')).toBe('Осталось пятнадцать минут, балл шесть и пять и семь и пять')
  })

  it('время', () => {
    expect(spellNumbersRu('урок в 18:30 и в 9:05')).toBe('урок в восемнадцать тридцать и в девять ноль пять')
    expect(spellNumbersRu('в 18:00')).toBe('в восемнадцать ноль ноль')
  })

  it('уровни и коды с латиницей не трогает — их читают как есть', () => {
    expect(spellNumbersRu('Ваш уровень A2, цель — B1, IELTS 6')).toBe('Ваш уровень A2, цель — B1, IELTS шесть')
  })

  it('без цифр — без изменений', () => {
    expect(spellNumbersRu('Откройте «Практику».')).toBe('Откройте «Практику».')
  })
})
