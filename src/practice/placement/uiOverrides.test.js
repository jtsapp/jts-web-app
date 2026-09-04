import { describe, it, expect } from 'vitest'
import { placementText } from './uiOverrides.js'
import { T } from './strings.js'

describe('placementText', () => {
  it('не показывает ученику внутреннее «после пилота»', () => {
    for (const lang of ['ru', 'kk', 'en']) {
      expect(T(lang, 'a0Note')).toMatch(/пилот|pilot/i) // в бандле оно есть…
      expect(placementText(lang, 'a0Note')).not.toMatch(/пилот|pilot/i) // …а на экране нет
    }
  })

  it('переопределённая строка остаётся осмысленной', () => {
    expect(placementText('ru', 'a0Note')).toContain('два коротких вопроса')
    expect(placementText('kk', 'a0Note')).toContain('екі қысқа сұрақ')
    expect(placementText('en', 'a0Note')).toContain('two short questions')
  })

  it('всё остальное берётся из бандла как есть', () => {
    expect(placementText('ru', 'next')).toBe(T('ru', 'next'))
    expect(placementText('en', 'idk')).toBe("I don't know")
  })

  it('незнакомый язык не роняет экран', () => {
    expect(placementText('fr', 'next')).toBe(T('fr', 'next'))
  })
})
