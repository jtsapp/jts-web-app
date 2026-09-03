import { describe, it, expect } from 'vitest'
import {
  referenceMask,
  rhythmScore,
  coverageScore,
  normalizeWords,
  wordDistance,
  lyricsScore,
  syllables,
  paceScore,
  finalScore,
  medalFor,
  weakestLines,
  MASK_STEP_MS,
} from './scoring.js'

const LINES = [
  { id: 1, start: 0, end: 2, text: 'I woke up on a rainy Monday' },
  { id: 2, start: 3, end: 5, text: 'And the bus was late again' },
]

describe('маски', () => {
  it('эталон отмечает только время строк', () => {
    const m = referenceMask(LINES, 6)
    expect(m.length).toBe((6 * 1000) / MASK_STEP_MS)
    expect(m[0]).toBe(1)
    expect(m[39]).toBe(1) // 1.95 с — ещё первая строка
    expect(m[40]).toBe(0) // 2.0 с — уже пауза
    expect(m[60]).toBe(1) // 3.0 с — вторая строка
  })

  it('ритм: полное совпадение — 100, полный промах — 0', () => {
    const ref = referenceMask(LINES, 6)
    expect(rhythmScore(ref, ref)).toBe(100)
    const silence = new Uint8Array(ref.length)
    expect(rhythmScore(ref, silence)).toBe(0)
  })

  it('ритм падает, когда студент поёт поверх пауз', () => {
    const ref = referenceMask(LINES, 6)
    const all = new Uint8Array(ref.length).fill(1)
    // Пересечение то же, объединение — вся песня: 80 из 120 окон.
    expect(Math.round(rhythmScore(ref, all))).toBe(67)
  })
})

describe('покрытие', () => {
  it('строка считается спетой с 60% голоса', () => {
    const ref = referenceMask(LINES, 6)
    const user = new Uint8Array(ref.length)
    for (let i = 0; i < 24; i++) user[i] = 1 // 1.2 с из 2 с первой строки = 60%
    const { score, perLine } = coverageScore(LINES, user)
    expect(perLine[0].sung).toBe(true)
    expect(perLine[1].sung).toBe(false)
    expect(score).toBe(50)
  })

  it('спеть начало строки и замолчать — не спетая строка', () => {
    const ref = referenceMask(LINES, 6)
    const user = new Uint8Array(ref.length)
    for (let i = 0; i < 10; i++) user[i] = 1 // 0.5 с из 2 с = 25%
    expect(coverageScore(LINES, user).perLine[0].sung).toBe(false)
  })
})

describe('слова', () => {
  it('разворачивает сокращения и чистит пунктуацию', () => {
    expect(normalizeWords("I'm gonna go, don't wait!")).toEqual([
      'i', 'am', 'going', 'to', 'go', 'do', 'not', 'wait',
    ])
  })

  it('притяжательное «s» не превращается в «is»', () => {
    expect(normalizeWords("the dog's bone")).toEqual(['the', "dog's", 'bone'])
  })

  it('расстояние считает замены, вставки и пропуски', () => {
    expect(wordDistance(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(0)
    expect(wordDistance(['a', 'b', 'c'], ['a', 'x', 'c'])).toBe(1)
    expect(wordDistance(['a', 'b', 'c'], ['a', 'c'])).toBe(1)
    expect(wordDistance(['a', 'b'], ['a', 'b', 'c'])).toBe(1)
  })

  it('точное попадание — 100, чужой текст — около нуля', () => {
    expect(lyricsScore('I woke up', 'I woke up').score).toBe(100)
    expect(lyricsScore('I woke up', 'completely different phrase').score).toBe(0)
  })

  it('возвращает слова, которых не было в распознанном тексте', () => {
    const { missed } = lyricsScore('rainy Monday morning', 'rainy morning')
    expect(missed).toEqual(['monday'])
  })
})

describe('темп', () => {
  it('слоги считаются грубо, но устойчиво', () => {
    expect(syllables('up')).toBe(1)
    expect(syllables('rainy')).toBe(2)
    expect(syllables('Monday')).toBe(2)
  })

  it('отклонение до 15% не штрафуется', () => {
    const base = { refSyllables: 100, refSungSec: 50 }
    expect(paceScore({ ...base, userSyllables: 100, userSungSec: 50 })).toBe(100)
    expect(paceScore({ ...base, userSyllables: 110, userSungSec: 50 })).toBe(100)
  })

  it('на отклонении 50% и больше — ноль', () => {
    const base = { refSyllables: 100, refSungSec: 50 }
    expect(paceScore({ ...base, userSyllables: 200, userSungSec: 50 })).toBe(0)
  })

  it('без распознавания сравнивает время пения', () => {
    // Пел вдвое дольше эталона — это отклонение 100%, ноль.
    expect(paceScore({ refSyllables: 100, refSungSec: 50, userSungSec: 100 })).toBe(0)
    expect(paceScore({ refSyllables: 100, refSungSec: 50, userSungSec: 52 })).toBe(100)
  })
})

describe('итоговый балл', () => {
  it('без распознавания веса перекладываются на ритм', () => {
    const withStt = finalScore({ lyrics: 0, rhythm: 100, coverage: 100, pace: 100, hasLyrics: true })
    const without = finalScore({ rhythm: 100, coverage: 100, pace: 100, hasLyrics: false })
    expect(withStt.score).toBe(65) // потерянные 35 — это вес слов
    expect(without.score).toBe(100) // слова просто не участвуют
  })

  it('минус поднимает балл, показанный перевод — опускает', () => {
    const plain = finalScore({ rhythm: 60, coverage: 60, pace: 60, hasLyrics: false })
    const inst = finalScore({ rhythm: 60, coverage: 60, pace: 60, hasLyrics: false, instrumental: true })
    const peeked = finalScore({ rhythm: 60, coverage: 60, pace: 60, hasLyrics: false, translationShown: true })
    expect(inst.score).toBeGreaterThan(plain.score)
    expect(peeked.score).toBeLessThan(plain.score)
  })

  it('балл не выходит за 100 даже с множителем', () => {
    const r = finalScore({ rhythm: 100, coverage: 100, pace: 100, hasLyrics: false, instrumental: true })
    expect(r.score).toBe(100)
    expect(r.medal).toBe('gold')
  })

  it('медали по порогам ТЗ', () => {
    expect(medalFor(90)).toBe('gold')
    expect(medalFor(75)).toBe('silver')
    expect(medalFor(60)).toBe('bronze')
    expect(medalFor(59)).toBe(null)
  })
})

describe('слабые строки', () => {
  it('берёт только неспетые и сортирует по худшему покрытию', () => {
    const perLine = [
      { id: 1, ratio: 0.9, sung: true },
      { id: 2, ratio: 0.1, sung: false },
      { id: 3, ratio: 0.4, sung: false },
    ]
    const lines = [
      { id: 1, start: 0, text: 'one' },
      { id: 2, start: 3, text: 'two' },
      { id: 3, start: 6, text: 'three' },
    ]
    expect(weakestLines(perLine, lines).map((l) => l.id)).toEqual([2, 3])
    expect(weakestLines(perLine, lines)[0].text).toBe('two')
  })
})
