import { describe, it, expect } from 'vitest'
import { fmtTime, lineAt, focusLineIndex, wordTimes, activeWordIndex, linesPassed, splitHard } from './timeline.js'

const LINES = [
  { id: 1, start: 1, end: 4, text: 'I woke up on a rainy Monday', words: [] },
  { id: 2, start: 5, end: 8, text: 'And the bus was late again', words: [] },
]

describe('время', () => {
  it('пишет минуты и секунды', () => {
    expect(fmtTime(192)).toBe('3:12')
    expect(fmtTime(48.9)).toBe('0:48')
    expect(fmtTime(NaN)).toBe('0:00')
  })
})

describe('строка в центре', () => {
  it('звучащая строка', () => {
    expect(lineAt(LINES, 2)).toBe(0)
    expect(focusLineIndex(LINES, 2)).toBe(0)
  })
  it('в проигрыше — следующая, а не пустое место', () => {
    expect(lineAt(LINES, 4.5)).toBe(-1)
    expect(focusLineIndex(LINES, 4.5)).toBe(1)
    expect(focusLineIndex(LINES, 0)).toBe(0)
  })
  it('после последней строки держим последнюю', () => {
    expect(focusLineIndex(LINES, 30)).toBe(1)
    expect(focusLineIndex([], 3)).toBe(-1)
  })
})

describe('слова', () => {
  it('без пословных таймкодов делит строку по длине слов', () => {
    const w = wordTimes({ start: 0, end: 10, text: 'aa bbbbbb aa', words: [] })
    expect(w.map((x) => x.w)).toEqual(['aa', 'bbbbbb', 'aa'])
    expect(w.map((x) => x.t)).toEqual([0, 2, 8])
  })
  it('берёт пословные таймкоды, когда они есть', () => {
    const line = { start: 0, end: 3, text: 'x y', words: [{ w: 'x', t: 0.2 }, { w: 'y', t: 1.5 }] }
    expect(wordTimes(line)).toEqual([{ w: 'x', t: 0.2 }, { w: 'y', t: 1.5 }])
  })
  it('активное слово — последнее начавшееся', () => {
    const line = { start: 0, end: 10, text: 'aa bbbbbb aa', words: [] }
    const w = wordTimes(line)
    expect(activeWordIndex(w, line, -1)).toBe(-1)
    expect(activeWordIndex(w, line, 1)).toBe(0)
    expect(activeWordIndex(w, line, 5)).toBe(1)
    expect(activeWordIndex(w, line, 11)).toBe(3)
  })
})

describe('пауза', () => {
  it('считает строки позади', () => {
    expect(linesPassed(LINES, 0)).toBe(0)
    expect(linesPassed(LINES, 4)).toBe(1)
    expect(linesPassed(LINES, 9)).toBe(2)
  })
})

describe('сложное слово', () => {
  it('подчёркивает само слово, без запятой', () => {
    expect(splitHard('Morning is calling, I open my eyes', 'calling')).toEqual([
      { text: 'Morning is ', hard: false },
      { text: 'calling', hard: true },
      { text: ', I open my eyes', hard: false },
    ])
  })
  it('ищет по нормализованной форме и только первое вхождение', () => {
    expect(splitHard('Monday, oh Monday', 'monday')).toEqual([
      { text: 'Monday', hard: true },
      { text: ', oh Monday', hard: false },
    ])
  })
  it('без слова — строка целиком', () => {
    expect(splitHard('one two', null)).toEqual([{ text: 'one two', hard: false }])
    expect(splitHard('one two', 'three')).toEqual([{ text: 'one two', hard: false }])
  })
})
