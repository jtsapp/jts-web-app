import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildRuns, makeDeck, parseOwnList, parts, runDeck, sample } from './runs.js'

const O = JSON.parse(readFileSync(new URL('./__fixtures__/oracle.json', import.meta.url), 'utf8'))
const W = (en, s = `I like ${en}.`) => [en, 'перевод', s, 'Перевод предложения.', '']
// Детерминированная «случайность» для воспроизводимых колод.
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length] }

const SET = {
  id: 'A0',
  name: 'Beginner',
  units: [
    { u: 1, title: 'You and me', lessons: [
      { l: 1, t: 'Family', g: '', w: Array.from({ length: 14 }, (_, k) => W(`w${k}`)) },
      { l: 2, t: 'Things', g: 'Plurals', w: [W('book'), W('pen')] },
      { l: 3, t: 'Review', g: '', w: [] },
    ] },
    { u: 2, title: '', lessons: [{ l: 4, t: 'Food', g: '', w: [W('apple')] }] },
  ],
}

describe('части урока', () => {
  it('совпадают с прототипом для 1…40 слов', () => {
    for (const [n, sizes] of O.parts) expect(parts(Array.from({ length: n }, (_, k) => k)).map((p) => p.length), String(n)).toEqual(sizes)
  })
})

describe('buildRuns', () => {
  const runs = buildRuns(SET)

  it('тест уровня — 20 случайных из всего набора', () => {
    expect(runs.test).toMatchObject({ key: 'A0-T', kind: 'test', size: 20 })
    expect(runs.test.words).toHaveLength(17)
  })

  it('«Повторить юнит» — 15 из слов юнита', () => {
    expect(runs.units[0].review).toMatchObject({ key: 'A0-U1', kind: 'unit', size: 15 })
    expect(runs.units[0].review.words).toHaveLength(16)
  })

  it('урок длиннее 12 слов делится на части с ключами L<n>-<часть>', () => {
    const l1 = runs.units[0].lessons[0]
    expect(l1.runs.map((r) => [r.key, r.words.length, r.parts])).toEqual([['A0-L1-0', 7, 2], ['A0-L1-1', 7, 2]])
    expect(runs.units[0].lessons[1].runs.map((r) => r.key)).toEqual(['A0-L2-0'])
  })

  it('пустой урок — повторение уроков после прошлого повторения', () => {
    const rev = runs.units[0].lessons[2]
    expect(rev).toMatchObject({ review: true, fromL: 1, toL: 2 })
    expect(rev.runs[0]).toMatchObject({ key: 'A0-L3-R', kind: 'review', size: 20 })
    expect(rev.runs[0].words).toHaveLength(16)
  })
})

describe('колода', () => {
  it('карточки с обрезанными полями и отброшенными вариантами без целевого слова', () => {
    const deck = makeDeck([[' book ', ' книга ', 'This is my book.||Nice day.||A book here.', 'Это моя книга.', undefined]], () => 0)
    expect(deck).toEqual([{ en: 'book', ru: 'книга', exEn: 'This is my book.||A book here.', exRu: 'Это моя книга.', note: '' }])
  })

  it('прогон с size берёт случайную выборку, без size — все слова', () => {
    const r = { words: [W('a1'), W('b1'), W('c1')], size: 2 }
    expect(runDeck(r, seq(0.1, 0.9))).toHaveLength(2)
    expect(runDeck({ words: r.words }, seq(0.5))).toHaveLength(3)
    expect(sample([1, 2, 3, 4], 2, () => 0)).toHaveLength(2)
  })
})

describe('свой список', () => {
  it('строки «english - русский - sentence - предложение», пустые и без перевода отброшены', () => {
    expect(parseOwnList('apple - яблоко - I eat an apple. - Я ем яблоко.\nbig – большой\n\nbad\nfast\tбыстро')).toEqual([
      ['apple', 'яблоко', 'I eat an apple.', 'Я ем яблоко.'],
      ['big', 'большой'],
      ['fast', 'быстро'],
    ])
  })
})
