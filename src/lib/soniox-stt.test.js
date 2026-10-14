import { describe, it, expect } from 'vitest'
import { sonioxConfig } from './soniox-stt.js'

describe('sonioxConfig', () => {
  it('одиночный язык — как раньше, без контекста', () => {
    const c = sonioxConfig({ key: 'k', lang: 'en' })
    expect(c.language_hints).toEqual(['en'])
    expect(c).not.toHaveProperty('context')
    expect(c.api_key).toBe('k')
    expect(c.audio_format).toBe('auto')
  })

  it('список языков и контекст уходят как есть', () => {
    const context = { general: [{ key: 'domain', value: 'site help' }], terms: ['Тәжірибе'] }
    const c = sonioxConfig({ key: 'k', lang: ['kk', 'ru', 'en'], context })
    expect(c.language_hints).toEqual(['kk', 'ru', 'en'])
    expect(c.context).toEqual(context)
  })
})
