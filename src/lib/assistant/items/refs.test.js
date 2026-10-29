import { describe, it, expect } from 'vitest'
import { isItemRef, itemNav, parseItemRef } from './refs.js'

describe('адрес вещи', () => {
  it('разбирает все виды', () => {
    expect(parseItemRef('course.B1.L5')).toEqual({ kind: 'course', level: 'B1', id: 'L5' })
    expect(parseItemRef('course.b2.Xt3')).toEqual({ kind: 'course', level: 'B2', id: 'Xt3' })
    expect(parseItemRef('course.A2.EXAM')).toEqual({ kind: 'course', level: 'A2', id: 'EXAM' })
    expect(parseItemRef('grammar.b1.7')).toEqual({ kind: 'grammar', level: 'b1', id: '7' })
    expect(parseItemRef('ggame.L1-01')).toEqual({ kind: 'ggame', level: null, id: 'L1-01' })
    expect(parseItemRef('reading.b1-sci-tickle')).toEqual({ kind: 'reading', level: 'b1', id: 'b1-sci-tickle' })
    expect(parseItemRef('situation.a2.1')).toEqual({ kind: 'situation', level: 'a2', id: '1' })
    expect(parseItemRef('shadowing.calm-talk-ab3k9')).toEqual({ kind: 'shadowing', level: null, id: 'calm-talk-ab3k9' })
    expect(parseItemRef('words.farm')).toEqual({ kind: 'words', level: null, id: 'farm' })
    expect(parseItemRef('workbook.a1')).toEqual({ kind: 'workbook', level: 'a1', id: 'a1' })
    expect(parseItemRef('homework.m-7')).toEqual({ kind: 'homework', level: null, id: 'm-7' })
    expect(parseItemRef('live.45')).toEqual({ kind: 'live', level: null, id: '45' })
  })

  it('мусор — не адрес', () => {
    for (const bad of ['course.Z9.L5', 'course.B1.Q5', 'grammar.b1.x', 'situation.a2.x', 'workbook.z9', 'foo.1', 'practice', '', null]) {
      expect(parseItemRef(bad)).toBe(null)
      expect(isItemRef(bad)).toBe(false)
    }
    expect(isItemRef('course.B1.L5')).toBe(true)
    // Разделы белого списка (destinations.js) адресами не считаются.
    expect(isItemRef('practice-speaking')).toBe(false)
  })
})

describe('переход по адресу', () => {
  it('урок курса, тема, игра, текст, шэдоуинг, слова, воркбук, домашка, живой урок', () => {
    expect(itemNav('course.B1.L5')).toEqual({ nav: 'course', payload: { level: 'B1', lesson: 'L5' } })
    expect(itemNav('grammar.b1.7')).toEqual({ nav: 'practice', payload: { level: 'b1', unitId: 7 } })
    expect(itemNav('ggame.L1-01')).toEqual({ nav: 'grammar-games', payload: { topic: 'L1-01' } })
    expect(itemNav('reading.b1-sci-tickle')).toEqual({ nav: 'reading', payload: { level: 'b1', textId: 'b1-sci-tickle' } })
    expect(itemNav('shadowing.v2')).toEqual({ nav: 'shadowing', payload: 'v2' })
    expect(itemNav('words.farm')).toEqual({ nav: 'words', payload: { sceneId: 'farm' } })
    expect(itemNav('workbook.a1')).toEqual({ nav: 'workbook', payload: { level: 'a1' } })
    expect(itemNav('homework.123')).toEqual({ nav: 'homework', payload: { id: '123' } })
    expect(itemNav('live.45')).toEqual({ nav: 'lessons', payload: { lessonId: '45' } })
    expect(itemNav('practice')).toBe(null)
  })

  // Квота «Ситуаций» считается уровнями: уже открытый уровень — сразу сценарий,
  // новый — через карточку Практики, она спросит квоту.
  it('ситуация: открытый уровень — сразу, новый — через карточку Практики', () => {
    expect(itemNav('situation.a2.3', { situationsOpened: ['a2'] })).toEqual({ nav: 'situations', payload: { level: 'a2', id: 3 } })
    expect(itemNav('situation.a2.3', { situationsOpened: ['b1'] })).toEqual({ nav: 'practice', payload: { area: 'situations', level: 'a2' } })
    expect(itemNav('situation.a2.3')).toEqual({ nav: 'practice', payload: { area: 'situations', level: 'a2' } })
  })
})
