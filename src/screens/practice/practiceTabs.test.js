import { describe, it, expect } from 'vitest'
import { SKILLS, skillModules, skillOfModule, EXPANDABLE } from './practiceTabs.js'

describe('practiceTabs', () => {
  it('четыре навыка в порядке макета', () => {
    expect(SKILLS.map((s) => s.key)).toEqual(['listening', 'reading', 'writing', 'speaking'])
  })

  it('тренажёры навыка считаются по модулям, пара баннеров — за два', () => {
    expect(skillModules('reading')).toEqual(['tales', 'reading', 'books', 'comics'])
    expect(skillModules('writing')).toEqual(['grammar', 'writing', 'verbs', 'workbooks'])
    expect(skillModules('speaking')).toHaveLength(4)
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

  it('развернуть можно только секции-списки', () => {
    for (const s of SKILLS)
      for (const sec of s.sections)
        if (sec.all) expect(EXPANDABLE.has(sec.id), sec.id).toBe(true)
  })
})
