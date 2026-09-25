import { describe, it, expect } from 'vitest'
import {
  referenceMask,
  markSpan,
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
  lineWordMatches,
  linesToRepeat,
  missedSpan,
  MEDAL_MIN,
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

  it('на ускоренном треке маска не дырявится', () => {
    // 1,25×: между замерами VAD позиция уходит на 62 мс, то есть индекс
    // прыгает через клетку. Без заливки отрезка каждая вторая оставалась бы
    // нулевой у того, кто пел не замолкая.
    const m = new Uint8Array(8)
    let prev = -1
    for (const idx of [0, 1, 3, 4, 6, 7]) {
      markSpan(m, prev, idx)
      prev = idx
    }
    expect([...m]).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
  })

  it('разрыв от перемотки не закрашивается как спетый', () => {
    const m = new Uint8Array(40)
    markSpan(m, 2, 30) // +1.4 с вперёд: между ними музыка не играла
    expect(m[3]).toBe(0)
    expect(m[29]).toBe(0)
    expect(m[30]).toBe(1)
    // Назад — тем более: прошлая клетка больше текущей.
    markSpan(m, 30, 5)
    expect(m[5]).toBe(1)
    expect(m[6]).toBe(0)
  })

  it('за пределы маски markSpan не пишет', () => {
    const m = new Uint8Array(4)
    expect(() => markSpan(m, -1, 4)).not.toThrow()
    expect([...m]).toEqual([0, 0, 0, 0])
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

  it('не спотыкается о слова из прототипа объекта', () => {
    // Сюда приходит и текст песни, и результат распознавания — то есть какой
    // угодно. У обычного литерала CONTRACTIONS['constructor'] вернул бы
    // функцию Object, и разбор падал бы посреди подсчёта балла.
    expect(normalizeWords('the constructor came')).toEqual(['the', 'constructor', 'came'])
    expect(normalizeWords('valueOf toString hasOwnProperty')).toEqual([
      'valueof',
      'tostring',
      'hasownproperty',
    ])
    expect(lyricsScore('the constructor came', 'the constructor came').score).toBe(100)
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

  it('минус поднимает балл', () => {
    const plain = finalScore({ rhythm: 60, coverage: 60, pace: 60, hasLyrics: false })
    const inst = finalScore({ rhythm: 60, coverage: 60, pace: 60, hasLyrics: false, instrumental: true })
    expect(inst.score).toBeGreaterThan(plain.score)
  })

  it('балл не выходит за 100 даже с множителем', () => {
    const r = finalScore({ rhythm: 100, coverage: 100, pace: 100, hasLyrics: false, instrumental: true })
    expect(r.score).toBe(100)
    expect(r.medal).toBe('gold')
  })

  it('медаль соответствует тому баллу, который видит студент', () => {
    // 89.6 на экране округляется до 90, а золото начинается с 90: считать
    // медаль от неокруглённого — показать «90» и серебро.
    const r = finalScore({ rhythm: 89.6, coverage: 89.6, pace: 89.6, hasLyrics: false })
    expect(r.score).toBe(90)
    expect(r.medal).toBe(medalFor(r.score))
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

describe('слова по строкам', () => {
  it('раскладывает распознанный текст по строкам выравниванием', () => {
    // Во второй строке не прозвучали «bus» и «late» — остальное сошлось.
    const m = lineWordMatches(LINES, 'I woke up on a rainy Monday and the was again')
    expect(m[0]).toEqual({ id: 1, ratio: 1, missed: [] })
    expect(m[1].ratio).toBeCloseTo(4 / 6)
    expect(m[1].missed).toEqual(['bus', 'late'])
  })

  it('слово из соседней строки не засчитывается дважды', () => {
    // «again» спето один раз — в конце; первая строка его не содержит, а
    // построчное сравнение без выравнивания нашло бы его где угодно.
    const lines = [
      { id: 1, start: 0, end: 2, text: 'again and again' },
      { id: 2, start: 3, end: 5, text: 'never again' },
    ]
    const m = lineWordMatches(lines, 'never again')
    expect(m[0].ratio).toBe(0)
    expect(m[1].ratio).toBe(1)
  })

  it('лишние слова вокруг не съедают прозвучавшие', () => {
    // «Повторить» строку: разгон захватывает хвост соседней, и услышано больше,
    // чем в эталоне. Все пять спетых слов строки должны засчитаться.
    const line = [{ id: 1, start: 0, end: 4, text: 'Morning is calling, I open my eyes' }]
    const m = lineWordMatches(line, 'the blue skies morning is i open eyes walking these streets')
    expect(m[0].ratio).toBeCloseTo(5 / 7)
    expect(m[0].missed).toEqual(['calling'])
  })

  it('без распознанного текста всё пропущено, короткие слова не «сложные»', () => {
    const m = lineWordMatches(LINES, '')
    expect(m[0].ratio).toBe(0)
    expect(m[0].missed).toEqual(['woke', 'rainy', 'monday'])
  })
})

describe('строки для повтора', () => {
  const lines = [
    { id: 1, start: 0, end: 2, text: 'one' },
    { id: 2, start: 3, end: 5, text: 'two' },
    { id: 3, start: 6, end: 8, text: 'three' },
  ]

  it('со словами: худшие по совпадению, сложное слово — самое длинное', () => {
    const matches = [
      { id: 1, ratio: 0.9, missed: [] },
      { id: 2, ratio: 0.5, missed: ['sky', 'dancing'] },
      { id: 3, ratio: 0.2, missed: ['alone'] },
    ]
    const rows = linesToRepeat({ lines, matches })
    expect(rows.map((r) => r.id)).toEqual([3, 2])
    expect(rows[1].hard).toBe('dancing')
    expect(rows[0]).toMatchObject({ text: 'three', start: 6, end: 8 })
  })

  it('без слов: неспетые по маске, сложного слова нет', () => {
    const perLine = [
      { id: 1, ratio: 0.9, sung: true },
      { id: 2, ratio: 0.1, sung: false },
      { id: 3, ratio: 0.4, sung: false },
    ]
    const rows = linesToRepeat({ lines, perLine, matches: null })
    expect(rows.map((r) => [r.id, r.hard])).toEqual([[2, null], [3, null]])
  })
})

describe('пропущенные строки', () => {
  const lines = [
    { id: 1, start: 0, end: 2 },
    { id: 2, start: 3, end: 5 },
    { id: 3, start: 6, end: 8 },
  ]
  it('подряд — с отрезком времени', () => {
    const perLine = [{ sung: true }, { sung: false }, { sung: false }]
    expect(missedSpan(perLine, lines)).toEqual({ count: 2, from: 3, to: 8 })
  })
  it('вразброс — только число', () => {
    const perLine = [{ sung: false }, { sung: true }, { sung: false }]
    expect(missedSpan(perLine, lines)).toEqual({ count: 2 })
  })
  it('пропущено всё — без отрезка', () => {
    const perLine = [{ sung: false }, { sung: false }, { sung: false }]
    expect(missedSpan(perLine, lines)).toEqual({ count: 3 })
  })
  it('без пропусков — ноль', () => {
    expect(missedSpan([{ sung: true }], lines)).toEqual({ count: 0 })
  })
})

describe('пороги медалей', () => {
  it('таблица порогов совпадает с medalFor', () => {
    expect(medalFor(MEDAL_MIN.bronze)).toBe('bronze')
    expect(medalFor(MEDAL_MIN.silver)).toBe('silver')
    expect(medalFor(MEDAL_MIN.gold)).toBe('gold')
    expect(medalFor(MEDAL_MIN.bronze - 1)).toBe(null)
  })
})
