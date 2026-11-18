import { describe, it, expect } from 'vitest'
import { SKILLS, SKILL_KEYS, GAMES, GAME_MODULES, skillCards, skillModules, skillOfModule, skillKeyOf, EXPANDABLE } from './practiceTabs.js'
import { cardOf } from './practiceCatalog.js'

describe('practiceTabs', () => {
  // Источник — файл методиста practice-categories.md (задача 226 доски, версия 18.11.2026 «после созвона»): пять
  // вкладок по навыкам, игры — отдельный пункт меню.
  it('пять вкладок по навыкам: Аудирование, Говорение, Чтение, Письмо, Грамматика', () => {
    expect(SKILL_KEYS).toEqual(['listening', 'speaking', 'reading', 'writing', 'grammar'])
  })

  it('карточки вкладок — в порядке файла методиста', () => {
    // Видеодиктант (18.11.2026, спека video-dictation) — сразу после Cartoon World, файла методиста он новее.
    expect(skillCards('listening')).toEqual(['listenchoose', 'justListen', 'cartoons', 'videoDictation', 'memes', 'tales', 'shadowing', 'karaoke'])
    expect(skillCards('speaking')).toEqual(['situations', 'speakspin', 'pronunciation', 'shadowing', 'karaoke', 'speedReading'])
    // Literature World появился позже файла — стоит, где был: после комиксов, перед сказками.
    expect(skillCards('reading')).toEqual(['reading', 'speedReading', 'books', 'comics', 'literature', 'tales'])
    expect(skillCards('writing')).toEqual(['writing', 'workbooks', 'justListen', 'cartoons'])
    expect(skillCards('grammar')).toEqual(['grammar', 'topics', 'tenses', 'verbs', 'prepositions', 'punctuation', 'partsofspeech', 'workbooks'])
    // Ключи прежних раскладок вкладками больше не бывают.
    for (const old of ['grammarWriting', 'games', 'grammarGames', 'nope']) expect(skillCards(old), old).toEqual([])
  })

  it('у каждой вкладки одна группа без заголовка и подписи — «N тренажёров» считается сам', () => {
    for (const s of SKILLS) {
      expect(s.groups, s.key).toHaveLength(1)
      expect(s.groups[0].title, s.key).toBeUndefined()
      expect(s.sub, s.key).toBeUndefined()
    }
  })

  it('карточки в двух вкладках — как в файле', () => {
    const tabsOf = (id) => SKILL_KEYS.filter((k) => skillCards(k).includes(id))
    expect(tabsOf('shadowing')).toEqual(['listening', 'speaking'])
    expect(tabsOf('karaoke')).toEqual(['listening', 'speaking'])
    expect(tabsOf('tales')).toEqual(['listening', 'reading'])
    expect(tabsOf('speedReading')).toEqual(['speaking', 'reading'])
    expect(tabsOf('justListen')).toEqual(['listening', 'writing'])
    expect(tabsOf('cartoons')).toEqual(['listening', 'writing'])
    expect(tabsOf('workbooks')).toEqual(['writing', 'grammar'])
  })

  it('«N тренажёров» под вкладками: 8, 6, 6, 4, 8', () => {
    expect(SKILL_KEYS.map((k) => skillModules(k).length)).toEqual([8, 6, 6, 4, 8])
  })

  it('в Практике нет ни одной игры — они в разделе «Игры»', () => {
    const inTabs = new Set(SKILL_KEYS.flatMap(skillCards))
    for (const g of GAMES) expect(inTabs.has(g.id), g.id).toBe(false)
  })

  it('«Игры»: шесть игр в порядке файла, у каждой — что тренирует', () => {
    expect(GAMES.map((g) => g.id)).toEqual(['listening', 'words', 'numbers', 'speak', 'wordhunt', 'runner'])
    for (const g of GAMES) {
      expect(cardOf(g.id), g.id).toBeTruthy()
      expect(g.trains.length, g.id).toBeGreaterThan(0)
    }
    // две игры «Аркады» — один модуль
    expect([...GAME_MODULES].sort()).toEqual(['arcade', 'listening', 'numbers', 'wordhunt', 'words'])
  })

  it('переход с фильтром находит вкладку: первая из двух, «Скорочтение» — в «Чтении»', () => {
    expect(skillOfModule('books')).toBe('reading')
    expect(skillOfModule('situations')).toBe('speaking')
    expect(skillOfModule('tales')).toBe('listening')
    expect(skillOfModule('shadowing')).toBe('listening')
    expect(skillOfModule('listen')).toBe('listening')
    expect(skillOfModule('cartoons')).toBe('listening')
    expect(skillOfModule('videoDictation')).toBe('listening')
    expect(skillOfModule('speedReading')).toBe('reading')
    expect(skillOfModule('writing')).toBe('writing')
    expect(skillOfModule('workbooks')).toBe('writing')
    for (const m of ['grammar', 'grammarGames', 'tenses', 'verbs', 'prepositions', 'punctuation', 'partsofspeech'])
      expect(skillOfModule(m), m).toBe('grammar')
    // игры — не вкладка: App уводит такой переход в «Игры»
    for (const m of GAME_MODULES) expect(skillOfModule(m), m).toBeNull()
    expect(skillOfModule('nope')).toBeNull()
  })

  it('каждый модуль прежней раскладки нашёл место — вкладку или «Игры»', () => {
    const modules = [
      'grammar', 'writing', 'reading', 'words', 'verbs', 'listenchoose', 'listening', 'numbers', 'listen',
      'speedReading', 'cartoons', 'shadowing', 'situations', 'workbooks', 'tales', 'memes', 'books', 'comics',
      'karaoke', 'wordhunt', 'arcade', 'prepositions', 'pronunciation', 'punctuation', 'speakspin', 'grammarGames', 'tenses', 'partsofspeech', 'literature', 'videoDictation',
    ]
    for (const m of modules) expect(Boolean(skillOfModule(m)) || GAME_MODULES.has(m), m).toBe(true)
  })

  it('ключ вкладки из старой ссылки переводится в нынешний', () => {
    expect(skillKeyOf('grammarWriting')).toBe('grammar')
    expect(skillKeyOf('grammarGames')).toBe('grammar')
    expect(skillKeyOf('writing')).toBe('writing')
    expect(skillKeyOf('games')).toBeNull()
    expect(skillKeyOf(undefined)).toBeNull()
  })

  it('развернуть можно только каталоги — тот же набор, что знают Луна и «Главная»', () => {
    expect([...EXPANDABLE].sort()).toEqual(
      ['books', 'comics', 'grammar', 'karaoke', 'memes', 'shadowing', 'situations', 'tales', 'workbooks'],
    )
  })
})
