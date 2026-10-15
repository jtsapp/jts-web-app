import { describe, it, expect } from 'vitest'
import { satHiddenFor, isSatScreen } from './satGate.js'

describe('SAT скрыт на проде', () => {
  it('прод-домен — скрыт, в любом регистре и с портом', () => {
    expect(satHiddenFor('ai-tutor.justtostudy.kz', '')).toBe(true)
    expect(satHiddenFor('AI-Tutor.JustToStudy.kz:443', '')).toBe(true)
  })
  it('дев, локально и незнакомый адрес — виден', () => {
    for (const host of ['dev-tutor.justtostudy.kz', 'localhost', '127.0.0.1', 'preview.example.com', '']) {
      expect(satHiddenFor(host, '')).toBe(false)
    }
  })
  it('NEXT_PUBLIC_ENABLE_SAT=1 показывает его и на проде', () => {
    expect(satHiddenFor('ai-tutor.justtostudy.kz', '1')).toBe(false)
  })
  it('экраны SAT — сам раздел и все sat-*, чужие не задеваются', () => {
    for (const key of ['sat', 'sat-onboarding', 'sat-mock', 'sat-pricing', 'sat-diagnostic']) expect(isSatScreen(key)).toBe(true)
    for (const key of ['satellite', 'practice', 'ielts', 'ielts-pricing', null, undefined]) expect(isSatScreen(key)).toBe(false)
  })
})
