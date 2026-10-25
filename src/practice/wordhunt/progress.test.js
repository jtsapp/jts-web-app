// @vitest-environment jsdom
//
// Прогресс Word Hunt: форма прототипа без wip, сведение двух устройств и
// хранилище (запись → чтение, копия для движка, забитый localStorage).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WORDHUNT_KEY, WORDHUNT_WIP_KEY } from '../practiceKeys.js'
import { mergeWordHunt, normalize, readWip, readWordHunt, writeWip, writeWordHunt } from './progress.js'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

const empty = { stars: {}, pl: {}, comets: {}, ach: {}, days: {}, gals: {}, games: 0, cleared: 0, pure: 0 }

describe('normalize', () => {
  it('мусор и чужие поля отсеиваются, wip и язык прототипа в синк не идут', () => {
    expect(normalize(null)).toEqual(empty)
    const got = normalize({
      stars: { 'A0|a1_like': 1761400000000, '': 5, 'A0|x': 'да' },
      pl: { 'A0:1:0:abc': { x: [1, 0, 1, 1], h: { easy: {}, medium: { best: 61234.5 }, nope: {} } }, bad: 3 },
      days: { '2026-10-25': 1, когда: 1 },
      wip: { 'A0:1:0:abc:0': { seed: 's', keys: '', v: 'A.', r: '00', h: [0] } },
      lang: 'kk',
      games: 3.7,
      last: 'A0:1:0:abc',
      optTimed: true,
      cleanHunt: true,
      evil: { a: 1 },
    })
    expect(got).toEqual({
      ...empty,
      stars: { 'A0|a1_like': 1761400000000 },
      pl: { 'A0:1:0:abc': { x: [1, 0, 1], h: { easy: {}, medium: { best: 61234 } } } },
      days: { '2026-10-25': 1 },
      games: 3,
      last: 'A0:1:0:abc',
      optTimed: true,
      cleanHunt: 1,
    })
  })
})

describe('mergeWordHunt: собранное где угодно — собрано', () => {
  const phone = {
    stars: { 'A0|a': 100, 'A0|b': 300 },
    pl: { p1: { x: [1, 1, 0], h: { easy: { best: 50000 } } } },
    comets: { 'A0|c': 200 },
    ach: { first: 100 },
    days: { '2026-10-24': 1 },
    gals: { A0: 1 },
    games: 5, cleared: 1, pure: 0,
    last: 'p1',
  }
  const laptop = {
    stars: { 'A0|a': 50, 'A1|z': 900 },
    pl: { p1: { x: [1, 0, 1], h: { easy: { best: 40000 }, medium: {} } }, p2: { x: [1, 0, 0], h: {} } },
    comets: { 'A0|c': 800, 'A0|d': 700 },
    ach: { first: 120, s50: 900 },
    days: { '2026-10-25': 1 },
    gals: { A1: 1 },
    games: 3, cleared: 2, pure: 1,
    last: 'p2', optTimed: true, cleanHunt: 1,
  }
  const m = mergeWordHunt(phone, laptop)

  it('слова, шаги, сложности, награды, дни и миры — объединением', () => {
    expect(m.stars).toEqual({ 'A0|a': 50, 'A0|b': 300, 'A1|z': 900 })
    expect(m.pl.p1).toEqual({ x: [1, 1, 1], h: { easy: { best: 40000 }, medium: {} } })
    expect(m.pl.p2).toEqual({ x: [1, 0, 0], h: {} })
    expect(m.ach).toEqual({ first: 100, s50: 900 })
    expect(Object.keys(m.days).sort()).toEqual(['2026-10-24', '2026-10-25'])
    expect(m.gals).toEqual({ A0: 1, A1: 1 })
  })

  it('счётчики — максимум, рекорд времени — лучший, кометы — объединением со свежей меткой', () => {
    expect([m.games, m.cleared, m.pure]).toEqual([5, 2, 1])
    expect(m.comets).toEqual({ 'A0|c': 800, 'A0|d': 700 })
    expect(m.cleanHunt).toBe(1)
  })

  it('«последний урок» и «на время» — у копии со свежей игрой', () => {
    expect(m.last).toBe('p2')
    expect(m.optTimed).toBe(true)
    const older = mergeWordHunt(laptop, { ...phone, stars: { ...phone.stars, 'A2|new': 5000 } })
    expect(older.last).toBe('p1')
    expect(older.optTimed).toBeUndefined()
  })

  it('сведение с пустой копией ничего не теряет', () => {
    expect(mergeWordHunt(phone, {})).toEqual(normalize(phone))
    expect(mergeWordHunt({}, laptop)).toEqual(normalize(laptop))
  })
})

describe('хранилище Word Hunt', () => {
  it('пустое хранилище читается как пустой прогресс', () => {
    expect(readWordHunt()).toEqual(empty)
  })

  it('записанное читается обратно и лежит под ключом прототипа', () => {
    writeWordHunt({ ...empty, stars: { 'A0|a': 1 }, games: 1 })
    expect(readWordHunt().stars).toEqual({ 'A0|a': 1 })
    expect(JSON.parse(localStorage.getItem(WORDHUNT_KEY))).toEqual(readWordHunt())
  })

  it('read отдаёт копию: движок меняет её, не трогая память', () => {
    writeWordHunt({ ...empty, stars: { 'A0|a': 1 } })
    const s = readWordHunt()
    s.stars['A0|b'] = 2
    expect(readWordHunt().stars).toEqual({ 'A0|a': 1 })
  })

  it('забитый localStorage не прячет собранное', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    writeWordHunt({ ...empty, stars: { 'A0|a': 1 } })
    writeWordHunt({ ...empty, stars: { 'A0|a': 1, 'A0|b': 2 } })
    expect(Object.keys(readWordHunt().stars)).toEqual(['A0|a', 'A0|b'])
  })

  it('wip — отдельным ключом устройства, пустой wip ключ убирает', () => {
    writeWip({ 'A0:1:0:x:0': { seed: 's', keys: 'k', v: 'A..', r: '100', h: [1, 0] }, junk: 5 })
    expect(Object.keys(readWip())).toEqual(['A0:1:0:x:0'])
    expect(localStorage.getItem(WORDHUNT_KEY)).toBeNull()
    writeWip({})
    expect(localStorage.getItem(WORDHUNT_WIP_KEY)).toBeNull()
  })
})
