import { describe, it, expect } from 'vitest'
import { phoneDigits, formatPhone, isPhoneComplete } from './lead.js'

describe('phoneDigits', () => {
  it('семёрка префикса «+7 (» — код страны, а не начало номера', () => {
    expect(phoneDigits('+7 (')).toBe('')
    expect(phoneDigits('+7 (7')).toBe('7')
    expect(phoneDigits('+7 (747) 163-41-18')).toBe('7471634118')
  })
  it('вставленный номер с восьмёркой или семёркой без плюса', () => {
    expect(phoneDigits('8 747 163 41 18')).toBe('7471634118')
    expect(phoneDigits('77471634118')).toBe('7471634118')
  })
  it('десять цифр без кода страны остаются как есть', () => {
    expect(phoneDigits('7471634118')).toBe('7471634118')
  })
  it('лишние цифры обрезаются', () => {
    expect(phoneDigits('+7 (747) 163-41-18999')).toBe('7471634118')
  })
})

describe('formatPhone', () => {
  it('рисует маску по мере ввода', () => {
    expect(formatPhone('')).toBe('+7 (')
    expect(formatPhone('747')).toBe('+7 (747')
    expect(formatPhone('7471')).toBe('+7 (747) 1')
    expect(formatPhone('7471634')).toBe('+7 (747) 163-4')
    expect(formatPhone('7471634118')).toBe('+7 (747) 163-41-18')
  })
  it('Backspace после скобки не упирается в неё', () => {
    // «+7 (747) 1» → стёрли «1» → «+7 (747) » → снова парсим
    expect(formatPhone(phoneDigits('+7 (747) '))).toBe('+7 (747')
  })
})

describe('isPhoneComplete', () => {
  it('номер целиком — ровно десять цифр', () => {
    expect(isPhoneComplete('7471634118')).toBe(true)
    expect(isPhoneComplete('747163')).toBe(false)
    expect(isPhoneComplete('74716341a8')).toBe(false)
  })
})
