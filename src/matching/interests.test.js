import { it, expect } from 'vitest'
import { toggleInterest, INTEREST_CATS, ALL_INTERESTS, interestLabel } from './interests.js'

it('caps interests at five and keeps six categories', () => {
  expect(INTEREST_CATS).toHaveLength(6)
  expect(ALL_INTERESTS).toHaveLength(22)
  const list = ['Аниме', 'K-pop', 'Музыка', 'Игры', 'Книги']
  expect(toggleInterest(list, 'Наука')).toEqual({ list, error: 'limit' })
  expect(toggleInterest(list, 'Аниме').list).toHaveLength(4)
  expect(toggleInterest([], 'Наука')).toEqual({ list: ['Наука'], error: null })
})

it('translates every interest for kk and en', () => {
  for (const item of ALL_INTERESTS) {
    expect(interestLabel('en', item)).not.toMatch(/[а-яё]/i)
    expect(interestLabel('kk', item)).toBeTruthy()
  }
  expect(interestLabel('ru', 'Аниме')).toBe('Аниме')
})
