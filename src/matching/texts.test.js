import { it, expect } from 'vitest'
import { TEXTS, matchingText, pluralForm, tariffLineText } from './texts.js'

it('ru, kk and en have the same keys', () => {
  const keys = (o) => Object.keys(o).sort()
  expect(keys(TEXTS.kk)).toEqual(keys(TEXTS.ru))
  expect(keys(TEXTS.en)).toEqual(keys(TEXTS.ru))
})

it('every placeholder of the Russian text exists in the translations', () => {
  const holes = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',')
  for (const key of Object.keys(TEXTS.ru)) {
    expect(holes(TEXTS.en[key]), key).toBe(holes(TEXTS.ru[key]))
    expect(holes(TEXTS.kk[key]), key).toBe(holes(TEXTS.ru[key]))
  }
})

it('fills variables and builds the read-only tariff line', () => {
  expect(matchingText('ru', 'time.show', { n: 4 })).toBe('Показать учителей (4) →')
  expect(pluralForm(1)).toBe('one')
  expect(pluralForm(3)).toBe('few')
  expect(pluralForm(12)).toBe('many')
  expect(tariffLineText('ru', { name: 'General', guarantee: true, duration: 60, perWeek: 2 }))
    .toBe('General English · гарантия · уроки по 60 мин · 2 раза в неделю')
})
