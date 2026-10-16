import { describe, it, expect } from 'vitest'
import { assistantCallHiddenFor } from './callGate.js'

describe('кнопка звонка Луне по домену', () => {
  it('прод — скрыта, дев и локалка — видна, флаг сборки открывает и на проде', () => {
    expect(assistantCallHiddenFor('ai-tutor.justtostudy.kz', '')).toBe(true)
    expect(assistantCallHiddenFor('dev-tutor.justtostudy.kz', '')).toBe(false)
    expect(assistantCallHiddenFor('localhost', '')).toBe(false)
    expect(assistantCallHiddenFor('ai-tutor.justtostudy.kz', '1')).toBe(false)
  })
})
