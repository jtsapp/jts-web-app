import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { FAMILIES, toOklch, familyOf, bgOf, textOf, lineOf } = require('./dark-palette.js')

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))
const lch = (s) => toOklch(hex(s))

describe('семейства бренда', () => {
  it('каждый цвет брендбука попадает в своё семейство и остаётся собой', () => {
    for (const [name, h] of Object.entries(FAMILIES)) {
      expect(familyOf(lch(h))).toBe(name)
      expect(bgOf(lch(h))).toBe(name)
    }
  })

  it('чужие оттенки притягиваются к ближайшему цвету бренда', () => {
    expect(familyOf(lch('#14b8a6'))).toBe('green') // бирюзовый
    expect(familyOf(lch('#6366f1'))).toBe('acc') // индиго
    expect(familyOf(lch('#3b82f6'))).toBe('blue')
    expect(familyOf(lch('#f59e0b'))).toBe('yellow') // янтарный
    expect(familyOf(lch('#f97316'))).toBe('orange')
    expect(familyOf(lch('#ef4444'))).toBe('red')
  })

  // Корень жалобы «не сочетались цвета»: серые светлой темы с оттенком
  // (лавандовые подложки, slate) раньше давали цветной графит.
  it('лавандовые подложки и slate — серые', () => {
    for (const c of ['#ececf3', '#f3f0fa', '#faf8ff', '#e2e8f0', '#64748b', '#f8fafc']) {
      expect(familyOf(lch(c)), c).toBeNull()
    }
  })

  it('настоящие пастели — тинт своего семейства', () => {
    expect(bgOf(lch('#e6f6ec'))).toBe('green-tint')
    expect(bgOf(lch('#f1eaff'))).toBe('acc-tint')
    expect(bgOf(lch('#fdeaed'))).toBe('red-tint')
    expect(bgOf(lch('#fff3dc'))).toBe('yellow-tint')
  })

  it('яркая кнопка — сплошной цвет, а не мягкий фон той же светлоты', () => {
    expect(bgOf(lch('#22c55e'))).toBe('green')
    expect(bgOf(lch('#c4b5fd'))).toBe('acc-soft')
  })

  it('цветной текст и линии — тоже токены семейства', () => {
    expect(textOf(lch('#16a34a'))).toBe('green')
    expect(textOf(lch('#7c3aed'))).toBe('acc-text')
    expect(lineOf(lch('#bbf7d0'))).toBe('green-line')
    expect(lineOf(lch('#ef4444'))).toBe('red')
  })
})

// Значения токенов — в src/theme-dark.css; сверяем контраст текста с
// поверхностями (WCAG AA, 4.5:1), чтобы правка палитры его не уронила.
describe('контраст токенов темы', () => {
  const css = fs.readFileSync(path.join(__dirname, '../../src/theme-dark.css'), 'utf8')
  const token = (name) => {
    const m = new RegExp(`--dk-${name}:\\s*(#[0-9a-f]{6})\\s*;`, 'i').exec(css)
    if (!m) throw new Error(`нет HEX-токена --dk-${name}`)
    return m[1]
  }
  const lum = (h) => {
    const [r, g, b] = hex(h).map((c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  it('текст и цвета бренда читаются на карточке и на странице', () => {
    for (const fg of ['text', 'text-2', 'muted', 'acc-text', 'blue', 'green', 'orange', 'yellow', 'red']) {
      for (const bg of ['card', 'page', 'chip']) {
        expect(ratio(token(fg), token(bg)), `${fg} на ${bg}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('подпись на заливке акцентом и прочими цветами бренда', () => {
    expect(ratio(token('on-acc'), token('acc'))).toBeGreaterThanOrEqual(4.5)
    for (const fill of ['green', 'blue', 'orange', 'yellow', 'red']) {
      expect(ratio(token('on-bright'), token(fill)), fill).toBeGreaterThanOrEqual(4.5)
    }
  })
})
