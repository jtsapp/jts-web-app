import { describe, it, expect } from 'vitest'
import { SKILLS, SKILL_KEYS, skillCards, skillModules, skillOfModule, EXPANDABLE } from './practiceTabs.js'

describe('practiceTabs', () => {
  it('пять вкладок с прежними ключами', () => {
    expect(SKILL_KEYS).toEqual(['listening', 'reading', 'writing', 'speaking', 'grammarGames'])
  })

  it('карточки вкладок — в порядке экранов макета', () => {
    expect(skillCards('listening')).toEqual(['listenchoose', 'justListen', 'cartoons', 'shadowing', 'karaoke', 'memes', 'tales'])
    expect(skillCards('reading')).toEqual(['reading', 'books', 'comics', 'tales'])
    expect(skillCards('writing')).toEqual(['grammar', 'prepositions', 'writing', 'verbs', 'workbooks'])
    expect(skillCards('speaking')).toEqual(['pronunciation', 'situations', 'speakspin', 'shadowing', 'karaoke', 'tales'])
    expect(skillCards('grammarGames')).toEqual(['topics', 'speedReading', 'listening', 'words', 'numbers', 'wordhunt', 'speak', 'runner'])
    expect(skillCards('nope')).toEqual([])
  })

  it('сказки — последней карточкой в каждой вкладке, где они есть', () => {
    const withTales = SKILL_KEYS.filter((k) => skillCards(k).includes('tales'))
    expect(withTales).toEqual(['listening', 'reading', 'speaking'])
    for (const k of withTales) expect(skillCards(k).at(-1), k).toBe('tales')
  })

  it('«N тренажёров» под вкладками — как в макете: 7, 4, 5, 6', () => {
    expect(['listening', 'reading', 'writing', 'speaking'].map((k) => skillModules(k).length)).toEqual([7, 4, 5, 6])
    // Две карточки «Аркады» — один тренажёр.
    expect(skillModules('grammarGames').filter((m) => m === 'arcade')).toHaveLength(1)
  })

  it('у «Грамматики» две группы: тренажёры и игры; подпись вкладки — своя', () => {
    const skill = SKILLS.find((s) => s.key === 'grammarGames')
    expect(skill.groups.map((g) => g.title)).toEqual(['practice.group.trainers', 'practice.group.games'])
    expect(skill.sub).toBe('practice.skillSub.grammarGames')
  })

  it('переход с фильтром находит вкладку: игры и «Скорочтение» — в «Грамматике»', () => {
    expect(skillOfModule('books')).toBe('reading')
    expect(skillOfModule('situations')).toBe('speaking')
    expect(skillOfModule('tales')).toBe('listening')
    expect(skillOfModule('shadowing')).toBe('listening')
    expect(skillOfModule('grammar')).toBe('writing')
    expect(skillOfModule('listen')).toBe('listening')
    for (const m of ['words', 'listening', 'numbers', 'wordhunt', 'arcade', 'speedReading', 'grammarGames'])
      expect(skillOfModule(m), m).toBe('grammarGames')
    expect(skillOfModule('nope')).toBeNull()
  })

  it('каждый модуль прежней раскладки нашёл вкладку', () => {
    const modules = [
      'grammar', 'writing', 'reading', 'words', 'verbs', 'listenchoose', 'listening', 'numbers', 'listen',
      'speedReading', 'cartoons', 'shadowing', 'situations', 'workbooks', 'tales', 'memes', 'books', 'comics',
      'karaoke', 'wordhunt', 'arcade', 'prepositions', 'pronunciation', 'speakspin', 'grammarGames',
    ]
    for (const m of modules) expect(skillOfModule(m), m).toBeTruthy()
  })

  it('развернуть можно только каталоги — тот же набор, что знают Луна и «Главная»', () => {
    expect([...EXPANDABLE].sort()).toEqual(
      ['books', 'comics', 'grammar', 'karaoke', 'memes', 'shadowing', 'situations', 'tales', 'workbooks'],
    )
  })
})
