import { describe, it, expect } from 'vitest'
import { SAT_THEME_KEY, SAT_THEME_V2, saveSatTheme, satTheme } from './theme.js'

function mem(init = {}) {
  const m = new Map(Object.entries(init))
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }
}

describe('тема SAT', () => {
  it('новый ученик — тёмная', () => {
    const s = mem()
    expect(satTheme(s)).toBe('dark')
    expect(s.map.get(SAT_THEME_V2)).toBe('1')
  })

  it('старый профиль со светлой темой переводится на тёмную один раз', () => {
    const s = mem({ [SAT_THEME_KEY]: 'light' })
    expect(satTheme(s)).toBe('dark')
    // после перевода решает кнопка
    saveSatTheme('light', s)
    expect(satTheme(s)).toBe('light')
    expect(satTheme(s)).toBe('light')
  })

  it('без хранилища — тёмная', () => {
    expect(satTheme(null)).toBe('dark')
  })
})
