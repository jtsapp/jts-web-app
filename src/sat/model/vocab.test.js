import { describe, expect, it } from 'vitest'
import { buildDeck, counts, displayWord, grade, matchRound, nextIn, queue, shortDef, shuffle, status, todayLoad } from './vocab.js'

const T = Date.UTC(2026, 9, 5, 12)
const DAY = 86400000
const deck = buildDeck(
  [
    { id: 'v-a', word: 'Abate', definition: 'to become less intense; to subside' },
    { id: 'v-b', word: 'Benign', definition: 'gentle, kindly' },
    { id: 'v-c', word: 'Candid', definition: 'honest, direct' },
    { id: 'v-d', word: 'Deride', definition: 'to mock' },
  ],
  [{ id: 'vw-1', word: 'mitigate', definition: 'make less severe' }],
)

describe('словарь', () => {
  it('SM-2 — как SatVocabRulesTest: 1 → 6 → 15 дней, «Снова» через 10 минут, фактор не ниже 1.3', () => {
    let c = grade(null, 4, T)
    expect(c.interval).toBe(1)
    c = grade(c, 4, T)
    expect(c.interval).toBe(6)
    c = grade(c, 4, T)
    expect(c.interval).toBe(15)
    let a = grade(grade(grade(null, 5, T), 5, T), 0, T)
    expect(a.dueAt).toBe(T + 10 * 60000)
    expect(a.ef).toBeCloseTo(1.9, 9)
    for (let i = 0; i < 10; i++) a = grade(a, 0, T)
    expect(a.ef).toBe(1.3)
  })

  it('подписи кнопок: новое слово — 10 мин / 1 день / 1 день / 1 день, третий показ — по фактору', () => {
    expect(nextIn(null, 0, T)).toEqual({ n: 10, unit: 'min' })
    expect(nextIn(null, 4, T)).toEqual({ n: 1, unit: 'day' })
    const c = { ef: 2.5, interval: 6, reps: 2, lapses: 0 }
    expect(nextIn(c, 5, T)).toEqual({ n: 15, unit: 'day' })
  })

  it('свои слова — в колоде первыми, статус и счётчики', () => {
    expect(deck[0].own).toBe(true)
    const cards = { 'v-a': { interval: 1, dueAt: T - 1 }, 'v-b': { interval: 30, dueAt: T + 9 * DAY } }
    expect(status(cards['v-b'])).toBe('mastered')
    expect(counts(deck, cards, T)).toEqual({ new: 3, learning: 1, mastered: 1, due: 1 })
  })

  it('очередь: сначала просроченное, новые — до цели с учётом сделанного сегодня', () => {
    const cards = { 'v-a': { interval: 0, dueAt: T - 1 } }
    const q = queue(deck, cards, 3, 0, T)
    expect(q.items.map((w) => w.id)).toEqual(['v-a', 'vw-1', 'v-b'])
    expect(queue(deck, cards, 3, 2, T).items.map((w) => w.id)).toEqual(['v-a'])
    expect(queue(deck, {}, 3, 5, T).items).toHaveLength(0)
  })

  it('«Сегодня»: оценённое плюс просроченное плюс новые до цели', () => {
    const now = 1_000_000_000
    expect(todayLoad({ goal: 10, today: 0, cards: {} }, now)).toEqual({ done: 0, total: 10 })
    expect(todayLoad({ goal: 10, today: 2, cards: { a: { dueAt: now - 1 }, b: { dueAt: now + 1 } } }, now)).toEqual({ done: 2, total: 10 })
    // просроченных больше цели — все они на сегодня
    const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`w${i}`, { dueAt: now - 1 }]))
    expect(todayLoad({ goal: 5, today: 1, cards: many }, now)).toEqual({ done: 1, total: 13 })
  })

  it('игры: короткое определение, раунд пар без повторов, детерминированная перетасовка', () => {
    expect(shortDef(deck[1])).toBe('to become less intense')
    expect(shuffle([1, 2, 3, 4, 5], 7)).toEqual(shuffle([1, 2, 3, 4, 5], 7))
    const r = matchRound(deck, 3, 4)
    expect(r.words).toHaveLength(4)
    expect(new Set(r.defs.map((w) => w.id))).toEqual(new Set(r.words.map((w) => w.id)))
    expect(displayWord('Abate')).toBe('abate')
    expect(displayWord('mitigate')).toBe('mitigate')
  })
})
