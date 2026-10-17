import { describe, it, expect } from 'vitest'
import { isProdHost } from './ieltsGate.js'

describe('прод-домен', () => {
  it('прод-адрес узнаётся в любом регистре и с портом', () => {
    expect(isProdHost('ai-tutor.justtostudy.kz')).toBe(true)
    expect(isProdHost('AI-Tutor.JustToStudy.kz:443')).toBe(true)
  })
  it('дев, localhost и превью прод-доменом не считаются', () => {
    for (const host of ['dev-ai-tutor.justtostudy.kz', 'localhost', '127.0.0.1', '', null]) {
      expect(isProdHost(host)).toBe(false)
    }
  })
})
