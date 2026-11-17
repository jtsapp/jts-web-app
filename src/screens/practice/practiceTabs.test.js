import { describe, it, expect } from 'vitest'
import { SKILLS, SKILL_KEYS, skillCards, skillModules, skillOfModule, EXPANDABLE } from './practiceTabs.js'

describe('practiceTabs', () => {
  // Источник — файл методиста practice-categories.md (задача 226 доски, 17.11.2026): пять вкладок в этом порядке.
  it('пять вкладок: Аудирование, Говорение, Чтение, «Грамматика и письмо», Игры', () => {
    expect(SKILL_KEYS).toEqual(['listening', 'speaking', 'reading', 'grammarWriting', 'games'])
  })

  it('карточки вкладок — в порядке файла методиста', () => {
    expect(skillCards('listening')).toEqual([
      'listenchoose', 'justListen', 'cartoons', 'memes', 'tales', 'shadowing', 'karaoke', 'listening', 'numbers', 'words',
    ])
    expect(skillCards('speaking')).toEqual(['situations', 'speakspin', 'pronunciation', 'shadowing', 'karaoke', 'speedReading', 'speak'])
    // Literature World появился позже файла — стоит, где был: после комиксов, перед сказками.
    expect(skillCards('reading')).toEqual(['reading', 'speedReading', 'books', 'comics', 'literature', 'tales'])
    expect(skillCards('grammarWriting')).toEqual([
      'grammar', 'topics', 'tenses', 'verbs', 'prepositions', 'punctuation', 'partsofspeech', 'writing', 'workbooks',
    ])
    expect(skillCards('games')).toEqual(['listening', 'words', 'numbers', 'wordhunt', 'speak', 'runner', 'verbs'])
    expect(skillCards('writing')).toEqual([])
    expect(skillCards('grammarGames')).toEqual([])
    expect(skillCards('nope')).toEqual([])
  })

  it('у каждой вкладки одна группа без заголовка и подписи — «N тренажёров» считается сам', () => {
    for (const s of SKILLS) {
      expect(s.groups, s.key).toHaveLength(1)
      expect(s.groups[0].title, s.key).toBeUndefined()
      expect(s.sub, s.key).toBeUndefined()
    }
  })

  it('карточки в двух вкладках — как в файле: сказки уходят из «Говорения»', () => {
    const tabsOf = (id) => SKILL_KEYS.filter((k) => skillCards(k).includes(id))
    expect(tabsOf('shadowing')).toEqual(['listening', 'speaking'])
    expect(tabsOf('karaoke')).toEqual(['listening', 'speaking'])
    expect(tabsOf('tales')).toEqual(['listening', 'reading'])
    expect(tabsOf('speedReading')).toEqual(['speaking', 'reading'])
    for (const id of ['listening', 'numbers', 'words']) expect(tabsOf(id), id).toEqual(['listening', 'games'])
    expect(tabsOf('speak')).toEqual(['speaking', 'games'])
    expect(tabsOf('verbs')).toEqual(['grammarWriting', 'games'])
  })

  it('«N тренажёров» под вкладками: 10, 7, 6, 9, 6 — две карточки «Аркады» в «Играх» один тренажёр', () => {
    expect(SKILL_KEYS.map((k) => skillModules(k).length)).toEqual([10, 7, 6, 9, 6])
    expect(skillModules('games').filter((m) => m === 'arcade')).toHaveLength(1)
  })

  it('переход с фильтром находит вкладку: первая из двух, «Скорочтение» — в «Чтении»', () => {
    expect(skillOfModule('books')).toBe('reading')
    expect(skillOfModule('situations')).toBe('speaking')
    expect(skillOfModule('tales')).toBe('listening')
    expect(skillOfModule('shadowing')).toBe('listening')
    expect(skillOfModule('listen')).toBe('listening')
    expect(skillOfModule('speedReading')).toBe('reading')
    for (const m of ['listening', 'numbers', 'words']) expect(skillOfModule(m), m).toBe('listening')
    for (const m of ['grammar', 'grammarGames', 'tenses', 'verbs', 'prepositions', 'punctuation', 'partsofspeech', 'writing', 'workbooks'])
      expect(skillOfModule(m), m).toBe('grammarWriting')
    expect(skillOfModule('wordhunt')).toBe('games')
    expect(skillOfModule('arcade')).toBe('speaking')
    expect(skillOfModule('nope')).toBeNull()
  })

  it('каждый модуль прежней раскладки нашёл вкладку', () => {
    const modules = [
      'grammar', 'writing', 'reading', 'words', 'verbs', 'listenchoose', 'listening', 'numbers', 'listen',
      'speedReading', 'cartoons', 'shadowing', 'situations', 'workbooks', 'tales', 'memes', 'books', 'comics',
      'karaoke', 'wordhunt', 'arcade', 'prepositions', 'pronunciation', 'punctuation', 'speakspin', 'grammarGames', 'tenses', 'partsofspeech', 'literature',
    ]
    for (const m of modules) expect(skillOfModule(m), m).toBeTruthy()
  })

  it('развернуть можно только каталоги — тот же набор, что знают Луна и «Главная»', () => {
    expect([...EXPANDABLE].sort()).toEqual(
      ['books', 'comics', 'grammar', 'karaoke', 'memes', 'shadowing', 'situations', 'tales', 'workbooks'],
    )
  })
})
