import { describe, it, expect } from 'vitest'
import { STT_CONTEXT_MAX_CHARS, azureLocale, sttContext, sttLanguages } from './sttContext.js'

describe('языки распознавания', () => {
  it('первым — язык интерфейса, английский последним у ru/kk', () => {
    expect(sttLanguages('kk')).toEqual(['kk', 'ru', 'en'])
    expect(sttLanguages('ru')).toEqual(['ru', 'kk', 'en'])
    expect(sttLanguages('en')).toEqual(['en', 'ru', 'kk'])
    expect(sttLanguages('xx')).toEqual(['ru', 'kk', 'en'])
  })

  it('локаль Azure по интерфейсу', () => {
    expect(azureLocale('kk')).toBe('kk-KZ')
    expect(azureLocale('ru')).toBe('ru-RU')
    expect(azureLocale('en')).toBe('en-US')
    expect(azureLocale(undefined)).toBe('ru-RU')
  })
})

describe('контекст Soniox', () => {
  it('разделы сайта на русском и казахском, без дублей, в пределах лимита', () => {
    const c = sttContext({ screenId: 'homework' })
    expect(c.terms).toContain('Домашняя работа')
    expect(c.terms).toContain('Практика')
    expect(c.terms).toContain('Speaking Buddy')
    expect(c.terms).toContain('Үй жұмысы')
    expect(c.terms).toContain('Тәжірибе')
    expect(new Set(c.terms).size).toBe(c.terms.length)
    expect(c.terms.join('').length).toBeLessThanOrEqual(STT_CONTEXT_MAX_CHARS)
    expect(c.general.find((g) => g.key === 'current_screen')?.value).toBe('Домашняя работа')
  })

  it('имена экранов разбиты по стрелке, без кавычек и скобок', () => {
    const { terms } = sttContext({})
    expect(terms).toContain('Шэдоуинг')
    expect(terms).toContain('Профиль Вы')
    expect(terms.some((t) => /[→«»()]/.test(t))).toBe(false)
  })

  it('без экрана или с чужим id — без current_screen', () => {
    expect(sttContext({}).general.some((g) => g.key === 'current_screen')).toBe(false)
    expect(sttContext({ screenId: '__proto__' }).general.some((g) => g.key === 'current_screen')).toBe(false)
  })
})
