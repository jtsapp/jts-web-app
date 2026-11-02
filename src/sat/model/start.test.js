import { describe, expect, it } from 'vitest'
import { satStarted } from './start.js'

describe('satStarted', () => {
  it('ученик — только после онбординга и диагностики', () => {
    expect(satStarted({ access: true, onboarded: true, diagnosticDone: true })).toBe(true)
    expect(satStarted({ access: true, onboarded: true, diagnosticDone: false })).toBe(false)
    expect(satStarted({ access: true, onboarded: false, diagnosticDone: false })).toBe(false)
  })

  it('клоузер — сразу, без старта', () => {
    expect(satStarted({ access: true, showcase: true, onboarded: false, diagnosticDone: false })).toBe(true)
  })

  it('без доступа или ответа — нет, даже у клоузера', () => {
    expect(satStarted({ access: false, showcase: true })).toBe(false)
    expect(satStarted(null)).toBe(false)
  })
})
