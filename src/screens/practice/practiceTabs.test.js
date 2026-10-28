import { describe, it, expect } from 'vitest'
import { SKILLS, skillModules, skillOfModule, EXPANDABLE } from './practiceTabs.js'

describe('practiceTabs', () => {
  it('четыре навыка в порядке макета и пятым — «Грамматика · игры»', () => {
    expect(SKILLS.map((s) => s.key)).toEqual(['listening', 'reading', 'writing', 'speaking', 'grammarGames'])
  })

  it('сказки — последней секцией в каждой вкладке, где они есть', () => {
    const withTales = SKILLS.filter((s) => s.sections.some((sec) => sec.id === 'tales'))
    expect(withTales.map((s) => s.key)).toEqual(['listening', 'reading', 'speaking'])
    for (const s of withTales) expect(s.sections.at(-1).id, s.key).toBe('tales')
  })

  it('тренажёры навыка считаются по модулям, пара баннеров — за два', () => {
    // Word Hunt (25.10.2026) — перед «Аркадой».
    expect(skillModules('reading')).toEqual(['reading', 'books', 'comics', 'wordhunt', 'arcade', 'tales'])
    // Prepositions World (22.10.2026) — сразу после «Грамматики».
    expect(skillModules('writing')).toEqual(['grammar', 'prepositions', 'writing', 'verbs', 'workbooks'])
    // SpeakSpin (02.10.2026) — шестой у «Говорения», Pronunciation World (28.10.2026) — седьмой.
    expect(skillModules('speaking')).toHaveLength(7)
    expect(skillModules('speaking')).toContain('speakspin')
    expect(skillModules('listening')).toContain('words')
    expect(skillModules('nope')).toEqual([])
  })

  it('каждый модуль старой ленты нашёл вкладку', () => {
    const modules = [
      'grammar', 'writing', 'reading', 'words', 'verbs', 'listenchoose', 'listening',
      'shadowing', 'situations', 'workbooks', 'tales', 'memes', 'books', 'comics', 'karaoke',
    ]
    for (const m of modules) expect(skillOfModule(m), m).toBeTruthy()
    expect(skillOfModule('books')).toBe('reading')
    expect(skillOfModule('situations')).toBe('speaking')
    expect(skillOfModule('tales')).toBe('listening')
    expect(skillOfModule('nope')).toBeNull()
  })

  it('«Аркада» — в «Говорении» и «Чтении», последней перед сказками', () => {
    for (const key of ['speaking', 'reading']) {
      const ids = SKILLS.find((s) => s.key === key).sections.map((sec) => sec.id)
      expect(ids.slice(-2), key).toEqual(['arcade', 'tales'])
    }
    expect(skillOfModule('arcade')).toBeTruthy()
    // Игр две, без уровней — полного списка у секции нет.
    expect(EXPANDABLE.has('arcade')).toBe(false)
  })

  it('Just to Listen — во вкладке «Аудирование», до сказок', () => {
    const ids = SKILLS.find((s) => s.key === 'listening').sections.map((sec) => sec.id)
    expect(ids).toContain('justListen')
    expect(ids.indexOf('justListen')).toBeLessThan(ids.indexOf('tales'))
    expect(skillOfModule('listen')).toBe('listening')
  })

  it('«Скорочтение» — в «Аудировании» сразу после Just to Listen (Д5), своим экраном', () => {
    const ids = SKILLS.find((s) => s.key === 'listening').sections.map((sec) => sec.id)
    expect(ids.indexOf('speedReading')).toBe(ids.indexOf('justListen') + 1)
    expect(skillOfModule('speedReading')).toBe('listening')
    expect(EXPANDABLE.has('speedReading')).toBe(false)
  })

  it('«Грамматика · игры» — своя вкладка из одного раздела, а в «Письме» её больше нет (28.10.2026)', () => {
    const skill = SKILLS.find((s) => s.key === 'grammarGames')
    expect(skill.sections.map((sec) => sec.id)).toEqual(['grammarGames'])
    expect(skill.sub).toBe('practice.skillSub.grammarGames')
    expect(skillOfModule('grammarGames')).toBe('grammarGames')
    expect(skillModules('writing')).not.toContain('grammarGames')
    expect(EXPANDABLE.has('grammarGames')).toBe(false)
  })

  it('Prepositions World — во вкладке «Письмо» сразу после «Грамматики», широким баннером', () => {
    const ids = SKILLS.find((s) => s.key === 'writing').sections.map((sec) => sec.id)
    expect(ids.indexOf('prepositions')).toBe(ids.indexOf('grammar') + 1)
    expect(skillOfModule('prepositions')).toBe('writing')
    // Курс открывается своим экраном, «Посмотреть все» у него нет.
    expect(EXPANDABLE.has('prepositions')).toBe(false)
  })

  it('Pronunciation World — во вкладке «Говорение» сразу после «Шэдоуинга», широким баннером', () => {
    const ids = SKILLS.find((s) => s.key === 'speaking').sections.map((sec) => sec.id)
    expect(ids.indexOf('pronunciation')).toBe(ids.indexOf('shadowing') + 1)
    expect(skillOfModule('pronunciation')).toBe('speaking')
    expect(EXPANDABLE.has('pronunciation')).toBe(false)
  })

  it('Word Hunt — во вкладке «Чтение» сразу перед «Аркадой», широким баннером', () => {
    const ids = SKILLS.find((s) => s.key === 'reading').sections.map((sec) => sec.id)
    expect(ids.indexOf('wordhunt')).toBe(ids.indexOf('arcade') - 1)
    expect(skillOfModule('wordhunt')).toBe('reading')
    expect(EXPANDABLE.has('wordhunt')).toBe(false)
  })

  it('развернуть можно только секции-списки', () => {
    for (const s of SKILLS)
      for (const sec of s.sections)
        if (sec.all) expect(EXPANDABLE.has(sec.id), sec.id).toBe(true)
  })
})
