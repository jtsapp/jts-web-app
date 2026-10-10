import { describe, it, expect } from 'vitest'
import { ieltsHiddenFor, isIeltsScreen } from './ieltsGate.js'

describe('IELTS скрыт на проде', () => {
  it('прод-домен — скрыт, в любом регистре и с портом', () => {
    expect(ieltsHiddenFor('ai-tutor.justtostudy.kz', '')).toBe(true)
    expect(ieltsHiddenFor('AI-Tutor.JustToStudy.kz:443', '')).toBe(true)
  })
  it('дев, локально и незнакомый адрес — виден', () => {
    for (const host of ['dev-tutor.justtostudy.kz', 'localhost', '127.0.0.1', 'preview.example.com', '']) {
      expect(ieltsHiddenFor(host, '')).toBe(false)
    }
  })
  it('NEXT_PUBLIC_ENABLE_IELTS=1 показывает его и на проде', () => {
    expect(ieltsHiddenFor('ai-tutor.justtostudy.kz', '1')).toBe(false)
  })
  it('экраны IELTS — по префиксу, чужие не задеваются', () => {
    expect(isIeltsScreen('ielts')).toBe(true)
    expect(isIeltsScreen('ielts-mock')).toBe(true)
    expect(isIeltsScreen('practice')).toBe(false)
    expect(isIeltsScreen(null)).toBe(false)
  })
})
