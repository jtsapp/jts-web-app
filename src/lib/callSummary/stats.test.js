import { describe, it, expect } from 'vitest'

import { callStats, formatDuration, learnerTurns } from './stats.js'

describe('callStats', () => {
  it('считает только речь ученика', () => {
    const s = callStats([
      { role: 'tutor', text: 'Hello there. How are you today?' },
      { role: 'learner', text: 'I am fine, thanks.' },
    ])
    expect(s.turns).toBe(1)
    expect(s.words).toBe(4)
    expect(s.sentences).toBe(1)
  })

  it('транскрипт из одних реплик тьютора даёт нули', () => {
    const s = callStats([
      { role: 'tutor', text: 'Hello.' },
      { role: 'tutor', text: 'Anyone there?' },
    ])
    expect(s).toEqual({ words: 0, sentences: 0, uniqueWords: 0, turns: 0 })
  })

  it('пунктуация по краям не считается словом', () => {
    const s = callStats([{ role: 'learner', text: '— "well", ... yes!' }])
    expect(s.words).toBe(2)
  })

  it('апостроф и дефис держат слово целым', () => {
    const s = callStats([{ role: 'learner', text: "don't twenty-one" }])
    expect(s.words).toBe(2)
  })

  it('уникальные слова без учёта регистра', () => {
    const s = callStats([{ role: 'learner', text: 'Yes yes YES no' }])
    expect(s.words).toBe(4)
    expect(s.uniqueWords).toBe(2)
  })

  it('считает кириллицу как слова', () => {
    const s = callStats([{ role: 'learner', text: 'привет, как дела' }])
    expect(s.words).toBe(3)
  })

  it('реплика без пунктуации — одно предложение, а не ноль', () => {
    // STT не всегда расставляет точки: счётчик не должен схлопываться в 0.
    const s = callStats([
      { role: 'learner', text: 'i think it is fine' },
      { role: 'learner', text: 'yes' },
    ])
    expect(s.sentences).toBe(2)
  })

  it('несколько предложений в одной реплике', () => {
    const s = callStats([{ role: 'learner', text: 'One. Two! Three? Four…' }])
    expect(s.sentences).toBe(4)
  })

  it('пустой и кривой вход не роняют', () => {
    expect(callStats(undefined)).toEqual({ words: 0, sentences: 0, uniqueWords: 0, turns: 0 })
    expect(callStats([null, { role: 'learner' }, { role: 'learner', text: '   ' }]).turns).toBe(0)
  })
})

describe('learnerTurns', () => {
  it('отбрасывает пустые и чужие реплики', () => {
    expect(
      learnerTurns([
        { role: 'tutor', text: 'a' },
        { role: 'learner', text: '' },
        { role: 'learner', text: 'b' },
      ]),
    ).toEqual([{ role: 'learner', text: 'b' }])
  })
})

describe('formatDuration', () => {
  it('минуты и секунды', () => {
    expect(formatDuration(34)).toBe('0:34')
    expect(formatDuration(1215)).toBe('20:15')
  })
  it('часы добивают минуты нулём', () => {
    expect(formatDuration(3730)).toBe('1:02:10')
  })
  it('мусор — ноль', () => {
    expect(formatDuration(null)).toBe('0:00')
    expect(formatDuration(-5)).toBe('0:00')
    expect(formatDuration(undefined)).toBe('0:00')
  })
})
