import { it, expect } from 'vitest'
import { TEXTS, groupText } from './texts.js'

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

it('no translation is empty', () => {
  for (const lang of ['ru', 'kk', 'en']) {
    for (const [key, value] of Object.entries(TEXTS[lang])) expect(value.trim().length, `${lang}:${key}`).toBeGreaterThan(0)
  }
})

it('fills variables and falls back to Russian, then to the key', () => {
  expect(groupText('ru', 'sug.match', { n: 80 })).toBe('Совпадение 80%')
  expect(groupText('en', 'sug.seats', { n: 2, max: 6 })).toBe('Seats left: 2 of 6')
  expect(groupText('de', 'title')).toBe('Выбрать группу')
  expect(groupText('ru', 'no.such.key')).toBe('no.such.key')
})

it('every day, daypart, direction, payment and status label exists in every language', () => {
  const wanted = [
    ...['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((v) => 'day.' + v),
    ...['MORNING', 'DAY', 'EVENING'].map((v) => 'daypart.' + v),
    ...['GENERAL', 'KIDS', 'SAT', 'IELTS'].map((v) => 'direction.' + v),
    ...['BOOKING', 'TRIAL', 'PAID'].map((v) => 'pay.' + v),
    ...['RECRUITING', 'EXTENDED', 'WEEK_PASSED', 'FULL', 'CLOSED'].map((v) => 'status.' + v),
  ]
  for (const lang of ['ru', 'kk', 'en']) for (const key of wanted) expect(TEXTS[lang][key], `${lang}:${key}`).toBeTruthy()
})
