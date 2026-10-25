import { describe, it, expect } from 'vitest'
import { SKILLS, skillModules, skillOfModule, EXPANDABLE } from './practiceTabs.js'

describe('practiceTabs', () => {
  it('четыре навыка в порядке макета', () => {
    expect(SKILLS.map((s) => s.key)).toEqual(['listening', 'reading', 'writing', 'speaking'])
  })

  it('сказки — последней секцией в каждой вкладке, где они есть', () => {
    const withTales = SKILLS.filter((s) => s.sections.some((sec) => sec.id === 'tales'))
    expect(withTales.map((s) => s.key)).toEqual(['listening', 'reading', 'speaking'])
    for (const s of withTales) expect(s.sections.at(-1).id, s.key).toBe('tales')
  })

  it('тренажёры навыка считаются по модулям, пара баннеров — за два', () => {
    expect(skillModules('reading')).toEqual(['reading', 'books', 'comics', 'arcade', 'tales'])
    // «Грамматика · игры» (25.10.2026) — сразу после «Грамматики», Prepositions World (22.10.2026) — за ней.
    expect(skillModules('writing')).toEqual(['grammar', 'grammarGames', 'prepositions', 'writing', 'verbs', 'workbooks'])
    // SpeakSpin (02.10.2026) — шестой у «Говорения».
    expect(skillModules('speaking')).toHaveLength(6)
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

  it('«Грамматика · игры» — в «Письме» сразу после «Грамматики» (Д4), своим экраном', () => {
    const ids = SKILLS.find((s) => s.key === 'writing').sections.map((sec) => sec.id)
    expect(ids.indexOf('grammarGames')).toBe(ids.indexOf('grammar') + 1)
    expect(skillOfModule('grammarGames')).toBe('writing')
    expect(EXPANDABLE.has('grammarGames')).toBe(false)
  })

  it('Prepositions World — во вкладке «Письмо» сразу после «Грамматики · игр», широким баннером', () => {
    const ids = SKILLS.find((s) => s.key === 'writing').sections.map((sec) => sec.id)
    expect(ids.indexOf('prepositions')).toBe(ids.indexOf('grammarGames') + 1)
    expect(skillOfModule('prepositions')).toBe('writing')
    // Курс открывается своим экраном, «Посмотреть все» у него нет.
    expect(EXPANDABLE.has('prepositions')).toBe(false)
  })

  it('развернуть можно только секции-списки', () => {
    for (const s of SKILLS)
      for (const sec of s.sections)
        if (sec.all) expect(EXPANDABLE.has(sec.id), sec.id).toBe(true)
  })
})
