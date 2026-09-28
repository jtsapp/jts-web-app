// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readExamDraft, saveExamDraft, clearExamDraft } from './levelExamDraft.js'

const tokenFor = (userId) => `h.${btoa(JSON.stringify({ userId }))}.s`
const ANNA = tokenFor(7)
const BORIS = tokenFor(8)
const DAY = 24 * 60 * 60 * 1000

describe('levelExamDraft', () => {
  beforeEach(() => localStorage.clear())

  it('ответы переживают перезагрузку: сохранили — прочитали', () => {
    saveExamDraft(ANNA, 'A1', 'v1', { gd1: 1, g6: 0 })
    expect(readExamDraft(ANNA, 'a1', 'v1')).toEqual({ gd1: 1, g6: 0 })
  })

  it('черновик одного ученика не достаётся другому на том же компьютере', () => {
    saveExamDraft(ANNA, 'a1', 'v1', { gd1: 1 })
    expect(readExamDraft(BORIS, 'a1', 'v1')).toBe(null)
    expect(readExamDraft(null, 'a1', 'v1')).toBe(null)
  })

  it('уровни не мешают друг другу', () => {
    saveExamDraft(ANNA, 'a1', 'v1', { gd1: 1 })
    saveExamDraft(ANNA, 'b2', 'w2', { gd1: 2 })
    expect(readExamDraft(ANNA, 'a1', 'v1')).toEqual({ gd1: 1 })
    expect(readExamDraft(ANNA, 'b2', 'w2')).toEqual({ gd1: 2 })
  })

  it('экзамен поменялся (другая version) — старые ответы не подсовываем', () => {
    saveExamDraft(ANNA, 'a1', 'v1', { gd1: 1 })
    expect(readExamDraft(ANNA, 'a1', 'v2')).toBe(null)
  })

  it('через 14 дней черновик устаревает', () => {
    const t0 = Date.UTC(2026, 8, 1)
    saveExamDraft(ANNA, 'a1', 'v1', { gd1: 1 }, t0)
    expect(readExamDraft(ANNA, 'a1', 'v1', t0 + 13 * DAY)).toEqual({ gd1: 1 })
    expect(readExamDraft(ANNA, 'a1', 'v1', t0 + 15 * DAY)).toBe(null)
  })

  it('clear стирает только свой уровень', () => {
    saveExamDraft(ANNA, 'a1', 'v1', { gd1: 1 })
    saveExamDraft(ANNA, 'a2', 'v1', { gd1: 0 })
    clearExamDraft(ANNA, 'A1')
    expect(readExamDraft(ANNA, 'a1', 'v1')).toBe(null)
    expect(readExamDraft(ANNA, 'a2', 'v1')).toEqual({ gd1: 0 })
    clearExamDraft(ANNA, 'a2')
    expect(localStorage.getItem('jts_level_exam')).toBe(null)
  })

  it('мусор в хранилище не роняет экран и не превращается в ответы', () => {
    localStorage.setItem('jts_level_exam', '{не json')
    expect(readExamDraft(ANNA, 'a1', 'v1')).toBe(null)
    localStorage.setItem('jts_level_exam', JSON.stringify({ 7: { a1: { v: 'v1', at: Date.now(), answers: { gd1: 'x', g6: -1, g7: 1.5, g8: 2 } } } }))
    expect(readExamDraft(ANNA, 'a1', 'v1')).toEqual({ g8: 2 })
    // Пустой после чистки черновик — это «черновика нет».
    localStorage.setItem('jts_level_exam', JSON.stringify({ 7: { a1: { v: 'v1', at: Date.now(), answers: [1, 2] } } }))
    expect(readExamDraft(ANNA, 'a1', 'v1')).toBe(null)
  })
})
