import { describe, it, expect } from 'vitest'
import {
  COUNTER_FROM,
  PARTS_MAX,
  PHOTOS_MAX,
  TEXT_MAX,
  THREAD_MIN_TEXT,
  canAddPart,
  canPublish,
  counter,
  emptyDraft,
  fullText,
  insertAt,
  photoSlots,
  publishBody,
  readyMediaIds,
  tooShort,
} from './draft.js'

const photo = (status, id = null) => ({ key: `p${id}`, preview: 'blob:x', status, id })

describe('лимиты формы (спека §5.1, §7)', () => {
  it('текст 500, продолжений 4, фото 4, счётчик с 450', () => {
    expect([TEXT_MAX, PARTS_MAX, PHOTOS_MAX, COUNTER_FROM]).toEqual([500, 4, 4, 450])
  })

  it('счётчик появляется с 450 символов', () => {
    expect(counter('a'.repeat(449))).toEqual({ show: false, len: 449, over: false })
    expect(counter('a'.repeat(450))).toEqual({ show: true, len: 450, over: false })
    expect(counter('a'.repeat(501)).over).toBe(true)
  })

  it('продолжений и фото — не больше четырёх', () => {
    expect(canAddPart({ ...emptyDraft(), parts: ['1', '2', '3'] })).toBe(true)
    expect(canAddPart({ ...emptyDraft(), parts: ['1', '2', '3', '4'] })).toBe(false)
    expect(photoSlots({ ...emptyDraft(), photos: [photo('ready', 1)] })).toBe(3)
    expect(photoSlots({ ...emptyDraft(), photos: [1, 2, 3, 4].map((id) => photo('ready', id)) })).toBe(0)
  })
})

describe('вставка смайлика в позицию курсора', () => {
  it('в середину строки; курсор встаёт за вставкой', () => {
    expect(insertAt('Hello world', 5, '😀')).toEqual({ text: 'Hello😀 world', pos: 7 })
  })

  it('курсор неизвестен или вне строки — в конец', () => {
    expect(insertAt('Hi', null, '🙂')).toEqual({ text: 'Hi🙂', pos: 4 })
    expect(insertAt('Hi', 99, '🙂')).toEqual({ text: 'Hi🙂', pos: 4 })
  })

  it('не влезает в 500 — отказ, а не обрезанный смайлик', () => {
    expect(insertAt('a'.repeat(499), 0, '😀')).toBeNull()
    expect(insertAt('a'.repeat(498), 0, '😀')).toEqual({ text: `😀${'a'.repeat(498)}`, pos: 2 })
  })
})

describe('можно ли публиковать', () => {
  it('нужен текст или готовое фото', () => {
    expect(canPublish(emptyDraft())).toBe(false)
    expect(canPublish({ ...emptyDraft(), text: '   ' })).toBe(false)
    expect(canPublish({ ...emptyDraft(), text: 'Привет' })).toBe(true)
    expect(canPublish({ ...emptyDraft(), photos: [photo('ready', 7)] })).toBe(true)
  })

  it('пока фото грузится — нельзя: сервер ещё не знает его id', () => {
    expect(canPublish({ ...emptyDraft(), text: 'Привет', photos: [photo('uploading')] })).toBe(false)
  })

  it('ветке без фото нужно от 6 символов текста; с фото и у комментария — нет', () => {
    expect(THREAD_MIN_TEXT).toBe(6)
    expect(canPublish({ ...emptyDraft(), text: '  Да!  ' })).toBe(false)
    expect(canPublish({ ...emptyDraft(), text: 'Привет' }, 'thread')).toBe(true)
    expect(canPublish({ ...emptyDraft(), text: 'Да!', photos: [photo('ready', 7)] })).toBe(true)
    expect(canPublish({ ...emptyDraft(), text: 'Да!' }, 'comment')).toBe(true)
    expect(canPublish({ ...emptyDraft(), text: '+' }, 'comment')).toBe(true)
    expect(canPublish({ ...emptyDraft(), text: ' ' }, 'comment')).toBe(false)
  })

  it('подсказка «пару слов» — только у начатой короткой ветки без фото', () => {
    expect(tooShort({ ...emptyDraft(), text: 'Да!' })).toBe(true)
    expect(tooShort(emptyDraft())).toBe(false)
    expect(tooShort({ ...emptyDraft(), text: 'Привет' })).toBe(false)
    expect(tooShort({ ...emptyDraft(), text: 'Да!', photos: [photo('uploading')] })).toBe(false)
    expect(tooShort({ ...emptyDraft(), text: 'Да!' }, 'comment')).toBe(false)
  })
})

describe('тело публикации', () => {
  const draft = { text: '  Как запомнить артикли?  ', parts: [' the и a ', '   ', 'ещё'], photos: [photo('ready', 7), photo('ready', 9)] }

  it('ветка: тема, текст без пробелов по краям, непустые продолжения, id фото', () => {
    expect(publishBody(draft, { kind: 'thread', topic: 'GRAMMAR' })).toEqual({
      topic: 'GRAMMAR',
      text: 'Как запомнить артикли?',
      continuations: ['the и a', 'ещё'],
      mediaIds: [7, 9],
    })
    expect(readyMediaIds(draft)).toEqual([7, 9])
  })

  it('без продолжений и фото этих полей нет вовсе', () => {
    expect(publishBody({ ...emptyDraft(), text: 'Привет' }, { kind: 'thread', topic: 'QUESTION' })).toEqual({ topic: 'QUESTION', text: 'Привет' })
  })

  it('комментарий: parentId вместо темы, продолжений нет', () => {
    expect(publishBody(draft, { kind: 'comment', topic: 'GRAMMAR', parentId: 101 })).toEqual({
      text: 'Как запомнить артикли?',
      parentId: 101,
      mediaIds: [7, 9],
    })
  })

  it('копия для подсветки — текст и продолжения через перевод строки', () => {
    expect(fullText(draft)).toBe('Как запомнить артикли?\nthe и a\nещё')
  })
})
