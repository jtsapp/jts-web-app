import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { CARDS, cardOf } from './practiceCatalog.js'
import { SKILL_KEYS, skillCards, EXPANDABLE, GAMES } from './practiceTabs.js'

const PUBLIC = path.resolve(__dirname, '../../../public')

describe('practiceCatalog', () => {
  // Карточки вкладок Практики и раздела «Игры» (с 18.11.2026 игры — свой пункт меню, карточки те же).
  const used = [...new Set([...SKILL_KEYS.flatMap(skillCards), ...GAMES.map((g) => g.id)])]

  it('у каждой карточки раскладки есть описание, лишних описаний нет', () => {
    for (const id of used) expect(cardOf(id), id).toBeTruthy()
    expect(Object.keys(CARDS).sort()).toEqual([...used].sort())
    expect(cardOf('nope')).toBeNull()
  })

  it('карточка либо ведёт на экран, либо открывает список — не оба и не ничего', () => {
    for (const id of used) {
      const c = cardOf(id)
      expect(Boolean(c.nav) !== c.list, id).toBe(true)
    }
  })

  it('у каждой карточки есть обложка с содержимым раздела', () => {
    for (const id of used) {
      const c = cardOf(id)
      expect(fs.existsSync(path.join(PUBLIC, c.image)), `${id}: ${c.image}`).toBe(true)
      expect(c.cover, id).toBe(id === 'runner' ? 'photo' : 'collage')
    }
  })

  it('«Аркада» — две карточки, каждая открывает свою игру', () => {
    expect(cardOf('speak')).toMatchObject({ nav: 'arcade', payload: { game: 'speak' }, module: 'arcade', badge: 'beta' })
    expect(cardOf('runner')).toMatchObject({ nav: 'arcade', payload: { game: 'runner' }, module: 'arcade', cover: 'photo' })
  })

  it('«Темы по уровням» ведут на экран тем, «Скорочтение» помечено новым', () => {
    expect(cardOf('topics')).toMatchObject({ nav: 'grammar-games', module: 'grammarGames', chip: 'practice.card.topics.chip' })
    expect(cardOf('speedReading').badge).toBe('new')
  })

  it('списки карточек совпадают с EXPANDABLE раскладки', () => {
    for (const id of used) expect(cardOf(id).list, id).toBe(EXPANDABLE.has(id))
  })
})
