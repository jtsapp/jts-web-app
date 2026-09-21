import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { isSample, speakable } = require('./voice-step-cards.js')

describe('voice-step-cards — что озвучивать в шаге record', () => {
  it('английская строка — образец', () => {
    expect(isSample('I like coffee.')).toBe(true)
    expect(isSample("My closest friend is … . We've known each other for/since … .")).toBe(true)
  })

  // Половина строк record у B1 — задания по-русски: английский голос прочёл
  // бы кириллицу мусором.
  it('задание по-русски — не образец, даже с английскими вставками', () => {
    expect(isSample('Одно в Present Simple: как часто вы встречаетесь с друзьями.')).toBe(false)
    expect(isSample('Guilt-free бренды — реальный ответ или просто тренд? Используйте I’m convinced…')).toBe(false)
    expect(isSample('Досыңыз кім? Қанша уақыт таныссыз?')).toBe(false)
  })

  it('пустая строка — не образец', () => {
    expect(isSample('')).toBe(false)
    expect(isSample(null)).toBe(false)
  })
})

describe('voice-step-cards — speakable', () => {
  // «Вопрос → начало косвенного вопроса»: стрелку синтез прочёл бы вслух, а
  // это граница двух реплик.
  it('стрелка — граница реплик', () => {
    expect(speakable('What time does the museum close? → Could you tell me…?')).toBe(
      'What time does the museum close? Could you tell me…?',
    )
    expect(speakable('Check the booking for me. → I wonder if you could…')).toBe('Check the booking for me. I wonder if you could…')
    expect(speakable('Call me → Could you call me?')).toBe('Call me. Could you call me?')
  })

  it('ремарка (pause) — пауза, а не слово', () => {
    expect(speakable("So then … (pause) … Yes, it's true.")).toBe("So then … … … Yes, it's true.")
  })

  it('прежнее поведение: пары через разделитель и размеченные реплики', () => {
    expect(speakable('loose / lose')).toBe('loose, lose')
    expect(speakable('employer — employee')).toBe('employer, employee')
    expect(speakable('<b>On the phone:</b> I understand that… · Could you tell me…?')).toBe(
      'On the phone: I understand that… Could you tell me…?',
    )
  })
})
