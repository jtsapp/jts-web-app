import { describe, it, expect } from 'vitest'
import { embedNav } from './embedNav.js'
import { CARDS } from '../screens/practice/practiceCatalog.js'

describe('embedNav', () => {
  it('карточка со своим экраном ведёт на него', () => {
    expect(embedNav({ card: 'tenses', level: null, unit: null })).toEqual({ screen: 'tenses', payload: null })
  })

  it('игра «Аркады» несёт выбор игры', () => {
    expect(embedNav({ card: 'runner', level: null, unit: null })).toEqual({ screen: 'arcade', payload: { game: 'runner' } })
  })

  it('юнит грамматики открывается в «Практике» по уровню и номеру', () => {
    expect(embedNav({ card: 'grammar', level: 'a2', unit: '3' }))
      .toEqual({ screen: 'practice', payload: { level: 'a2', unitId: '3' } })
  })

  it('каталог без единицы открывается списком раздела', () => {
    expect(embedNav({ card: 'books', level: null, unit: null })).toEqual({ screen: 'practice', payload: { filter: 'books' } })
    expect(embedNav({ card: 'grammar', level: 'a2', unit: null })).toEqual({ screen: 'practice', payload: { filter: 'grammar' } })
  })

  it.each(Object.keys(CARDS))('карточка %s ведёт на экран', (card) => {
    const nav = embedNav({ card, level: null, unit: null })
    expect(typeof nav.screen).toBe('string')
    expect(nav.screen.length).toBeGreaterThan(0)
  })
})
