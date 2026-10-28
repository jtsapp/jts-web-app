import { describe, expect, it } from 'vitest'
import { mergePronunciation, normalize } from './progress.js'

describe('прогресс Pronunciation World', () => {
  it('normalize берёт только известную форму, нетронутый раунд — {}', () => {
    expect(normalize(null)).toEqual({ learned: {}, rounds: {}, tutorial: false, level: null, last: null })
    expect(
      normalize({
        tr: 'kk',
        learned: { 'A0.1': true, junk: true, 'B1.2': false },
        rounds: { 'A0.1': [{ done: true, best: 1.4, plays: 2 }, {}, { best: -1 }], bad: [{ done: true }], 'A1.1': 'x' },
        tutorial: true,
        level: 'B1',
        last: '<img>',
      }),
    ).toEqual({
      learned: { 'A0.1': true },
      rounds: { 'A0.1': [{ done: true, best: 1, plays: 2 }, {}, {}] },
      tutorial: true,
      level: 'B1',
      last: null,
    })
  })

  it('merge двух устройств: объяснённое и пройденное объединяются, лучшее — максимум', () => {
    const phone = {
      learned: { 'A0.1': true },
      rounds: { 'A0.1': [{ done: true, best: 0.9, plays: 3 }, { done: true, best: 0.5, plays: 1 }, {}] },
      tutorial: true,
      level: 'A0',
      last: 'A0.1',
    }
    const laptop = {
      learned: { 'A0.3': true },
      rounds: { 'A0.1': [{ done: true, best: 0.7, plays: 5 }, {}, {}], 'A0.3': [{ plays: 1 }, {}, {}] },
      tutorial: false,
      level: 'A1',
      last: null,
    }
    expect(mergePronunciation(phone, laptop)).toEqual({
      learned: { 'A0.1': true, 'A0.3': true },
      rounds: {
        'A0.1': [{ done: true, best: 0.9, plays: 5 }, { done: true, best: 0.5, plays: 1 }, {}],
        'A0.3': [{ plays: 1 }, {}, {}],
      },
      tutorial: true,
      // уровень карты — этого устройства, последняя тема — с сервера, раз здесь её нет
      level: 'A1',
      last: 'A0.1',
    })
  })
})
