import { describe, it, expect } from 'vitest'
import { phoneDigits, formatPhone, isPhoneComplete, buildLeadMessage, leadPayload, leadWhatsappUrl } from './lead.js'

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

describe('заявка', () => {
  const digits = '7471634118'
  it('номер целиком — только десять цифр', () => {
    expect(isPhoneComplete(digits)).toBe(true)
    expect(isPhoneComplete('747163')).toBe(false)
  })
  it('сообщение менеджеру с подставленными полями', () => {
    const msg = buildLeadMessage('Имя: {name}\nНомер: {phone}\nЦель: {goal}', { name: '  Алия ', digits, goal: 'IELTS' })
    expect(msg).toBe('Имя: Алия\nНомер: +7 (747) 163-41-18\nЦель: IELTS')
  })
  it('номер в формате бэкенда', () => {
    expect(leadPayload({ name: 'Алия', digits, goal: 'Работа' }).phone).toBe('77471634118')
  })
  it('ссылка в WhatsApp поддержки с текстом', () => {
    expect(leadWhatsappUrl('Привет & пока')).toBe('https://wa.me/77471634118?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%26%20%D0%BF%D0%BE%D0%BA%D0%B0')
  })
})
