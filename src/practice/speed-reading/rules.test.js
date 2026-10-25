import { describe, it, expect } from 'vitest'
import oracle from './__fixtures__/oracle.json'
import {
  SPEEDS,
  BASE_WPM,
  srWords,
  srAlign,
  starsOf,
  resultOf,
  speedWpm,
  paceSeconds,
  scrollMs,
  sampleIndexAt,
  todayCount,
  alignHeard,
  expandHeard,
} from './rules.js'

// Оракул считает сам прототип кабинета (scripts/speed-reading/extract-oracle.js): красный тест значит, что
// порт разъехался с исходником, и чинить надо порт.

describe('правила Скорочтения сверены с прототипом', () => {
  it('скорости — ровно семь, 1x = 150 сл/мин', () => {
    expect(SPEEDS).toEqual([0.5, 0.7, 1, 1.5, 2, 2.5, 3])
    expect(SPEEDS).toEqual(oracle.speeds)
    expect(BASE_WPM).toBe(oracle.base)
  })

  it('srAlign на всех наборах оракула', () => {
    expect(oracle.align.length).toBe(72)
    for (const c of oracle.align) expect(srAlign(srWords(c.text), c.heard), `${c.kind}: ${c.text.slice(0, 30)}`).toEqual(c.ok)
  })

  it('процент, звёзды и темп — как на экране итога прототипа', () => {
    for (const r of oracle.results) {
      expect(resultOf({ read: r.read, words: r.words, dur: r.dur }), JSON.stringify(r)).toEqual({ pct: r.pct, stars: r.stars, wpm: r.wpm })
    }
  })

  it('звёзды: 85 / 60 / 30', () => {
    expect([starsOf(100), starsOf(85), starsOf(84), starsOf(60), starsOf(59), starsOf(30), starsOf(29), starsOf(0), starsOf(null)]).toEqual([3, 3, 2, 2, 1, 1, 0, 0, null])
  })

  it('подпись скорости и длительность прокрутки', () => {
    for (const p of oracle.pace) {
      const words = oracle.texts.find((t) => t.id === p.text).words
      const wpm = speedWpm(BASE_WPM, p.mult)
      expect(wpm).toBe(p.wpm)
      expect(paceSeconds(words, wpm)).toBe(p.seconds)
      expect(scrollMs(words, wpm)).toBeCloseTo(p.totalMs, 6)
    }
  })

  it('темп образца как основа: 1x — темп диктора', () => {
    expect(speedWpm(163, 1)).toBe(163)
    expect(speedWpm(163, 0.5)).toBe(82)
    expect(speedWpm(null, 2)).toBe(300)
  })
})

describe('sampleIndexAt', () => {
  const t = [['Hello', 0.1, 0.4], ['everyone!', 0.5, 1.0], ['My', 1.2, 1.3]]
  it('слово, начавшееся не позже t', () => {
    expect(sampleIndexAt(t, 0, 3)).toBe(0)
    expect(sampleIndexAt(t, 0.55, 3)).toBe(1)
    expect(sampleIndexAt(t, 1.2, 3)).toBe(2)
    expect(sampleIndexAt(t, 9, 3)).toBe(2)
  })
  it('разметка другой длины — пропорционально', () => {
    expect(sampleIndexAt(t, 1.25, 6)).toBe(5)
    expect(sampleIndexAt(t, 0.55, 6)).toBe(3)
    expect(sampleIndexAt(t, 0.2, 6)).toBe(0)
  })
  it('без разметки — первое слово', () => {
    expect(sampleIndexAt([], 3, 5)).toBe(0)
    expect(sampleIndexAt(null, 3, 5)).toBe(0)
  })
})

describe('todayCount', () => {
  it('считает попытки с сегодняшней локальной датой', () => {
    const now = new Date(2026, 9, 25, 15)
    const list = [
      { createdAt: new Date(2026, 9, 25, 9).toISOString() },
      { createdAt: new Date(2026, 9, 24, 23).toISOString() },
      { createdAt: null },
      { createdAt: 'мусор' },
    ]
    expect(todayCount(list, now)).toBe(1)
  })
})

describe('числа цифрами в распознанном тексте', () => {
  const ok = (text, heard) => alignHeard(srWords(text), srWords(heard))
  it('412 засчитывает «four hundred and twelve», а 512 — цифры текста', () => {
    expect(ok('Your room is room four hundred and twelve, and the lifts', 'your room is room 412 and the lifts').every(Boolean)).toBe(true)
    expect(ok('welcome aboard Flight 512 from Astana', 'welcome aboard flight 512 from astana').every(Boolean)).toBe(true)
  })
  it('миллионы, запятые, минус и часы', () => {
    expect(ok('for over twelve million years', 'for over 12 million years').every(Boolean)).toBe(true)
    expect(ok('for over twelve million years', 'for over 12,000,000 years').every(Boolean)).toBe(true)
    expect(ok('a temperature of minus five degrees', 'a temperature of -5 degrees').every(Boolean)).toBe(true)
    expect(ok("this is the eight o'clock news", 'this is the 8:00 news').every(Boolean)).toBe(true)
    expect(ok('about one hundred and fifty kilometres', 'about 150 kilometres').every(Boolean)).toBe(true)
    expect(ok('twenty-five students', '25 students').every(Boolean)).toBe(true)
  })
  it('expandHeard оставляет цифры и дописывает слова', () => {
    expect(expandHeard(['412,'])).toEqual(['412,', 'four', 'hundred', 'and', 'twelve'])
    expect(expandHeard(['hello', '7'])).toEqual(['hello', '7', 'seven'])
    expect(expandHeard(['1.5'])).toEqual(['1.5'])
  })
})

describe('нижний предел темпа', () => {
  it('бегущая строка не медленнее 75 сл/мин — потолок записи 3 минуты на 225 слов', () => {
    expect(speedWpm(140, 0.5)).toBe(75)
    expect(speedWpm(150, 0.5)).toBe(75)
    expect(speedWpm(180, 0.5)).toBe(90)
  })
})
