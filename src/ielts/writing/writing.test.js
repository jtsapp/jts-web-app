import { describe, it, expect } from 'vitest'
import { countWords, describeChart, overallBand, promptText, selfCheckFor, writingTasks, kindKey } from './writing.js'

describe('Writing: задание и работа', () => {
  it('слова как на экзамене — тот же счёт, что у бэкенда', () => {
    expect(countWords("In 2020, well-known cities — don't they? — grew & changed.")).toBe(8)
    expect(countWords('   ')).toBe(0)
  })

  it('график текстом для модели: блок [Visual] с каждым значением', () => {
    const task = {
      question: 'The graph below shows cycling.',
      after: ['Write at least 150 words.'],
      chart: { type: 'line', title: 'Cycling', unit: '%', x: ['2000', '2010'], series: [{ name: 'Northport', values: [4, 11] }] },
    }
    expect(promptText(task)).toBe('The graph below shows cycling.\n\nWrite at least 150 words.\n\n[Visual]\nLine graph: "Cycling".\nNorthport: 2000 — 4%, 2010 — 11%.')
    expect(describeChart({ type: 'figure', kind: 'map', alt: 'Town in 1990 and now' })).toBe('Maps: Town in 1990 and now')
  })

  it('общий band — среднее с округлением IELTS', () => {
    expect(overallBand({ taskResponse: 6, coherenceCohesion: 6.5, lexicalResource: 6.5, grammaticalRange: 6 })).toBe(6.5)
    expect(overallBand({ taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammaticalRange: 6 })).toBe(7)
    expect(overallBand({ taskResponse: 7 })).toBeNull()
  })

  it('самопроверка — только критерии и вопросы своего вида задания', () => {
    const sc = { criteria: [
      { key: 'ta', kinds: ['t1ac', 't1gt'], questions: [{ key: 'a' }] },
      { key: 'cc', questions: [{ key: 'p' }, { key: 'o', kinds: ['t1ac'] }] },
    ] }
    expect(selfCheckFor(sc, 't2').map((c) => [c.key, c.questions.map((q) => q.key)])).toEqual([['cc', ['p']]])
  })

  it('Task 1 — по треку ученика, Task 2 — общий', () => {
    const items = [
      { id: 'A', kind: 'task1', module: 'academic' },
      { id: 'G', kind: 'task1', module: 'general' },
      { id: 'E', kind: 'task2', module: 'both' },
    ]
    expect(writingTasks(items, 'task1', 'general').map((t) => t.id)).toEqual(['G'])
    expect(writingTasks(items, 'task2', 'general').map((t) => t.id)).toEqual(['E'])
    expect(kindKey({ taskKind: 'task1_general' })).toBe('t1gt')
  })
})
