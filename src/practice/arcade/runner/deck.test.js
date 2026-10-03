import { describe, expect, it } from 'vitest'
import { RETRY_AFTER, createDeck, normPos, promptOf } from './deck.js'

// Зерно фиксировано (mulberry32): ряды случайные, но тест — нет.
function seeded(seed = 1) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const w = (id, en, ru, pos, topic, kk = `${ru}-kk`) => ({ id, en, ru, kk, pos, topic })

// Мини-словарь с теми же неровностями, что у настоящего: `adj` и `adjective`
// вперемешку, перевод из двух смыслов через запятую, общий смысл у big/large.
const WORDS = [
  w(1, 'big', 'большой', 'adj', 'size'),
  w(2, 'large', 'большой, крупный', 'adjective', 'size'),
  w(3, 'small', 'маленький', 'adj', 'size'),
  w(4, 'tiny', 'крошечный', 'adjective', 'size'),
  w(5, 'red', 'красный', 'adj', 'color'),
  w(6, 'dog', 'собака', 'noun', 'animals'),
  w(7, 'cat', 'кошка', 'noun', 'animals'),
  w(8, 'run', 'бежать', 'verb', 'move'),
  w(9, 'walk', 'идти', 'verb', 'move'),
  w(10, 'quickly', 'быстро', 'adverb', 'manner'),
]
const POS = Object.fromEntries(WORDS.map((x) => [x.en, normPos(x.pos)]))

const rows = (n, opts = {}) => {
  const deck = createDeck(WORDS, { rng: seeded(7), ...opts })
  return Array.from({ length: n }, () => deck.next())
}

describe('normPos и promptOf', () => {
  it('сводит длинные имена частей речи к коротким', () => {
    expect(normPos('adjective')).toBe('adj')
    expect(normPos('Adverb ')).toBe('adv')
    expect(normPos('phrasal verb')).toBe('verb')
    expect(normPos('noun')).toBe('noun')
  })

  it('вопрос по-казахски только в казахском интерфейсе', () => {
    expect(promptOf(WORDS[0], 'kk')).toBe('большой-kk')
    expect(promptOf(WORDS[0], 'ru')).toBe('большой')
    expect(promptOf(WORDS[0], 'en')).toBe('большой')
    expect(promptOf({ ru: 'да', kk: '' }, 'kk')).toBe('да')
  })
})

describe('createDeck', () => {
  it('ряд: вопрос-перевод и ровно одни верные ворота из трёх разных', () => {
    for (const row of rows(60)) {
      expect(row.options).toHaveLength(3)
      expect(new Set(row.options).size).toBe(3)
      expect(row.options[row.correct]).toBe(row.answer)
      expect(WORDS.find((x) => x.en === row.answer).ru).toBe(row.prompt)
    }
  })

  it('ложные ворота — той же части речи, когда её хватает', () => {
    for (const row of rows(200)) {
      if (POS[row.answer] !== 'adj') continue
      for (const option of row.options) expect(POS[option]).toBe('adj')
    }
  })

  it('сначала — та же тема: у small ложные только из size', () => {
    const smallRows = rows(400).filter((r) => r.answer === 'small')
    expect(smallRows.length).toBeGreaterThan(0)
    for (const row of smallRows) expect(row.options).not.toContain('red')
  })

  it('не ставит ложными слово с тем же смыслом: big и large не встречаются вместе', () => {
    for (const row of rows(300)) {
      if (row.answer === 'big') expect(row.options).not.toContain('large')
      if (row.answer === 'large') expect(row.options).not.toContain('big')
    }
  })

  it('смысл сравнивается на языке вопроса', () => {
    const words = [
      w(1, 'lake', 'озеро', 'noun', 'x', 'көл'),
      w(2, 'pond', 'пруд', 'noun', 'x', 'көл'),
      w(3, 'river', 'река', 'noun', 'x', 'өзен'),
      w(4, 'sea', 'море', 'noun', 'x', 'теңіз'),
    ]
    const deck = createDeck(words, { lang: 'kk', rng: seeded(3) })
    for (let i = 0; i < 100; i++) {
      const row = deck.next()
      if (row.answer === 'lake') expect(row.options).not.toContain('pond')
      if (row.answer === 'lake') expect(row.prompt).toBe('көл')
    }
  })

  it('верная дорожка случайна: каждая выпадает заметно часто', () => {
    const counts = [0, 0, 0]
    for (const row of rows(300)) counts[row.correct]++
    for (const c of counts) expect(c).toBeGreaterThan(60)
  })

  it('слова не повторяются, пока не кончится пул', () => {
    const ids = rows(10).map((r) => r.id)
    expect(new Set(ids).size).toBe(10)
  })

  it('слово с ошибкой возвращается через RETRY_AFTER рядов', () => {
    const deck = createDeck(WORDS, { rng: seeded(11) })
    const first = deck.next()
    deck.miss(first)
    const after = Array.from({ length: RETRY_AFTER + 1 }, () => deck.next())
    expect(after.slice(0, RETRY_AFTER).map((r) => r.id)).not.toContain(first.id)
    expect(after[RETRY_AFTER].id).toBe(first.id)
  })

  it('чистит пул: дубли en, слова без перевода; меньше трёх — ошибка', () => {
    const deck = createDeck([...WORDS, w(99, 'Big', 'крупный', 'adj', 'size'), { id: 100, en: 'x', ru: '', kk: '' }])
    expect(deck.size).toBe(WORDS.length)
    expect(() => createDeck(WORDS.slice(0, 2))).toThrow()
  })
})
