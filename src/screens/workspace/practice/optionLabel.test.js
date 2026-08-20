import { describe, it, expect } from 'vitest'
import { optionsAreCards, splitOptionLabel } from './optionLabel.js'

describe('splitOptionLabel', () => {
  it('отделяет картинку от слова', () => {
    expect(splitOptionLabel('☕️ Coffee')).toEqual({ emoji: '☕️', text: 'Coffee' })
    expect(splitOptionLabel('📅 Mondays')).toEqual({ emoji: '📅', text: 'Mondays' })
  })

  it('вариант без картинки остаётся словом', () => {
    expect(splitOptionLabel('Coffee')).toEqual({ emoji: '', text: 'Coffee' })
  })

  it('вариант из одной картинки — сам себе подпись', () => {
    expect(splitOptionLabel('👍')).toEqual({ emoji: '', text: '👍' })
  })

  it('составную картинку не режет пополам', () => {
    expect(splitOptionLabel('👩‍👩‍👧 Family')).toEqual({ emoji: '👩‍👩‍👧', text: 'Family' })
    expect(splitOptionLabel('🇷🇺 Русский')).toEqual({ emoji: '🇷🇺', text: 'Русский' })
  })

  it('пустое не ломает разбор', () => {
    expect(splitOptionLabel(null)).toEqual({ emoji: '', text: '' })
  })
})

describe('optionsAreCards', () => {
  it('картинка со словом — карточки', () => {
    expect(optionsAreCards(['☕️ Coffee', '📅 Mondays'])).toBe(true)
  })

  it('одни значки и голый текст — не карточки', () => {
    expect(optionsAreCards(['👍', '👎'])).toBe(false)
    expect(optionsAreCards(['Часто', 'Редко'])).toBe(false)
    expect(optionsAreCards([])).toBe(false)
  })
})
