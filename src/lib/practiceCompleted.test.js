// Ревью 08.10.2026: демо-лимит «Словаря» считал state.vocab.seenCount, а его
// писала только старая сессия словаря (src/practice/vocab/Session.jsx), которую
// с 27.08.2026 никто не открывает: живая практика пишет vocabLearned и
// vocabMisses. Счётчик стоял на нуле — положительный лимит не срабатывал никогда.
import { describe, it, expect } from 'vitest'
import { completedCountFor } from './practiceCompleted.js'

describe('completedCountFor — сколько пройдено для квоты', () => {
  it('словарь: уникальные слова из «изучено» и «хуже запомненных»', () => {
    const state = {
      vocabLearned: { scopes: { A1: ['a', 'b'], B1: ['c'] } },
      vocabMisses: { words: { d: { word: 'd' }, a: { word: 'a' } } },
    }
    expect(completedCountFor('vocab', state)).toBe(4)
  })

  it('словарь: старый seenCount не теряется (берётся больший)', () => {
    expect(completedCountFor('vocab', { vocab: { seenCount: 10 }, vocabLearned: { scopes: { A1: ['a'] } } })).toBe(10)
  })

  it('пустое состояние — ноль', () => {
    expect(completedCountFor('vocab', {})).toBe(0)
  })

  it('прочие модули — как раньше', () => {
    expect(completedCountFor('grammar', { grammar: { done: ['a1:1', 'a1:2'] } })).toBe(2)
    expect(completedCountFor('writing', { writing: { tasks: { x: 1, y: 1, z: 1 } } })).toBe(3)
    expect(completedCountFor('books', { books: { done: [1] } })).toBe(0)
  })
})
