import { test, expect } from '@playwright/test'
import { buildLearn, nextTask } from '../src/practice/vocab/engine.js'

// Pure-logic юнит-тесты движка Словаря (без DOM) — по образцу
// listening-engine.spec.js: выполняются в node-контексте Playwright.

const word = (id) => ({ id, en: 'word' + id, ru: 'слово' + id, ph: '' })
const GROUP_TYPES = ['memory', 'match', 'dragmatch']

test.describe('vocab engine — nextTask()', () => {
  // Регрессия: при наборе из 1 слова match/dragmatch вырождались в задание
  // с единственной парой («Соедините слово и перевод» с одним вариантом).
  test('одно слово в наборе: групповые механики не выпадают', () => {
    for (const strength of [0, 1, 2]) {
      const L = buildLearn([{ w: word(1), known: false }])
      L.items[0].strength = strength
      for (let i = 0; i < 60; i++) {
        const t = nextTask(L)
        expect(GROUP_TYPES, `выпал ${t.type} при strength=${strength}`).not.toContain(t.type)
      }
    }
  })

  test('два слова в наборе: групповые механики не выпадают', () => {
    for (const strength of [1, 2]) {
      const L = buildLearn([{ w: word(1), known: false }, { w: word(2), known: false }])
      L.items.forEach((it) => (it.strength = strength))
      for (let i = 0; i < 60; i++) {
        const t = nextTask(L)
        expect(GROUP_TYPES, `выпал ${t.type} при strength=${strength}`).not.toContain(t.type)
      }
    }
  })

  test('четыре слова: групповые механики появляются и несут минимум 3 пары', () => {
    const L = buildLearn([1, 2, 3, 4].map((id) => ({ w: word(id), known: false })))
    L.items.forEach((it) => (it.strength = 1))
    let seenGroup = false
    for (let i = 0; i < 300; i++) {
      const t = nextTask(L)
      if (GROUP_TYPES.includes(t.type)) {
        seenGroup = true
        expect(t.pool.length).toBeGreaterThanOrEqual(3)
      }
    }
    expect(seenGroup).toBe(true)
  })
})
