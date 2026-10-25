import { describe, it, expect } from 'vitest'
import { normalizeText, normalizeSample, normalizeAttempt, attemptBody } from './data.js'

describe('normalizeText', () => {
  it('ответ бэкенда как есть', () => {
    const t = normalizeText({ id: 'hello', level: 'A1', icon: '👋', title: { ru: 'Знакомство', kk: 'Танысу', en: 'Hi' }, body: 'Hello  everyone!\nMy name', words: 99, sample: null })
    expect(t).toEqual({ id: 'hello', level: 'A1', icon: '👋', title: { ru: 'Знакомство', kk: 'Танысу', en: 'Hi' }, body: 'Hello  everyone!\nMy name', words: 4, sample: null })
  })
  it('терпит форму прототипа и заголовок строкой JSON', () => {
    const t = normalizeText({ id: 'w', lv: 'A2', ic: '⛅', t: '{"ru":"Погода","kk":"Ауа","en":"Weather"}', x: 'It is cold.' })
    expect(t).toMatchObject({ level: 'A2', icon: '⛅', title: { ru: 'Погода', kk: 'Ауа', en: 'Weather' }, body: 'It is cold.', words: 3 })
  })
  it('без текста или id — запись отбрасывается', () => {
    expect(normalizeText({ id: 'x', body: '   ' })).toBeNull()
    expect(normalizeText({ body: 'Hello' })).toBeNull()
    expect(normalizeText(null)).toBeNull()
  })
  it('пустые языки заголовка добираются из соседних', () => {
    expect(normalizeText({ id: 'x', body: 'a', title: { ru: 'Привет' } }).title).toEqual({ ru: 'Привет', kk: 'Привет', en: 'Привет' })
  })
})

describe('normalizeSample', () => {
  it('нужны адрес и разметка; темп — число или null', () => {
    expect(normalizeSample({ url: 'u', words: [['a', 0, 1]], wpm: 160 })).toEqual({ url: 'u', words: [['a', 0, 1]], wpm: 160 })
    expect(normalizeSample({ url: 'u', words: [['a', '0.5', '1']], wpm: 0 })).toEqual({ url: 'u', words: [['a', 0.5, 1]], wpm: null })
    expect(normalizeSample({ url: 'u', words: '[["a",0,1]]' })).toEqual({ url: 'u', words: [['a', 0, 1]], wpm: null })
    expect(normalizeSample({ words: [] })).toBeNull()
    expect(normalizeSample(null)).toBeNull()
  })
})

describe('normalizeAttempt', () => {
  it('терпит snake_case', () => {
    expect(normalizeAttempt({ id: 7, text_id: 'hello', speed: '1.5', duration_sec: 40, words_total: 80, words_read: 60, percent: 75, stars: 2, wpm: 90, scored_by: 'server', coins: 4, created_at: '2026-10-25T10:00:00Z' })).toEqual({
      id: 7, textId: 'hello', speed: 1.5, durationSec: 40, wordsTotal: 80, wordsRead: 60, percent: 75, stars: 2, wpm: 90, scoredBy: 'server', coins: 4, createdAt: '2026-10-25T10:00:00Z',
    })
  })
  it('null-поля остаются null', () => {
    expect(normalizeAttempt({ id: 1, textId: 'a', percent: null, wpm: null })).toMatchObject({ percent: null, wpm: null, stars: 0, coins: 0 })
  })
})

describe('attemptBody', () => {
  it('ровно девять полей, целые и в пределах проверки бэкенда', () => {
    const body = attemptBody({ textId: 'hello', speed: 1.5, durationSec: 40.6, wordsTotal: 80, wordsRead: 60, percent: 75, stars: 2, wpm: 89.6, scoredBy: 'server', extra: 1, url: 'blob:x' })
    expect(body).toEqual({ textId: 'hello', speed: 1.5, durationSec: 41, wordsTotal: 80, wordsRead: 60, percent: 75, stars: 2, wpm: 90, scoredBy: 'server' })
    expect(Object.keys(body)).toHaveLength(9)
  })
  it('без оценки: percent и wpm — null, звёзд нет', () => {
    expect(attemptBody({ textId: 'a', speed: 1, durationSec: 999, wordsTotal: 10, wordsRead: null, percent: null, stars: null, wpm: null, scoredBy: 'none' })).toEqual({
      textId: 'a', speed: 1, durationSec: 200, wordsTotal: 10, wordsRead: 0, percent: null, stars: 0, wpm: null, scoredBy: 'none',
    })
  })
  it('прочитано не больше, чем слов', () => {
    expect(attemptBody({ textId: 'a', speed: 2, durationSec: 5, wordsTotal: 10, wordsRead: 12, percent: 100, stars: 3, wpm: 1, scoredBy: 'browser' }).wordsRead).toBe(10)
  })
})
