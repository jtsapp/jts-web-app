// Форма записи журнала оценок и вычистка ПД (ТЗ 8.5): что роут примет от окна и что уйдёт в базу.
import { describe, it, expect } from 'vitest'
import { MAX_ANSWER, RatingRequestError, actionKey, hasFeedback, parseRatingRequest, scrubPersonal } from './ratingShape.js'

const base = { id: 'r0123456789abc', chat: 'c0123456789abc', question: 'Почему неверно?', answer: 'Потому что…', lang: 'ru' }

describe('parseRatingRequest', () => {
  it('разбирает запись окна и отбрасывает лишнее', () => {
    const e = parseRatingRequest({ ...base, turn: 2, seq: 3, screen: 'lesson-workspace', model: 'claude-haiku-5-5', channel: 'voice', firstMs: 900, soundMs: 2100, actions: ['open:practice'], extra: 'x', profileId: 'user-1' })
    expect(e).toMatchObject({ id: base.id, chat: base.chat, turn: 2, seq: 3, screen: 'lesson-workspace', model: 'claude-haiku-5-5', channel: 'voice', firstMs: 900, soundMs: 2100, actions: ['open:practice'], rating: null, reasons: [], comment: '' })
    expect(e).not.toHaveProperty('extra')
    expect(e).not.toHaveProperty('profileId')
  })

  it('id и разговор — обязательны и в своём алфавите', () => {
    expect(() => parseRatingRequest({ ...base, id: 'короткий' })).toThrow(RatingRequestError)
    expect(() => parseRatingRequest({ ...base, chat: '' })).toThrow(RatingRequestError)
    expect(() => parseRatingRequest(null)).toThrow(RatingRequestError)
    expect(() => parseRatingRequest([base])).toThrow(RatingRequestError)
  })

  it('оценка — up / down, причина — из списка, и только к 👎', () => {
    expect(parseRatingRequest({ ...base, rating: 'up', reasons: ['wrong'], comment: 'плохо' })).toMatchObject({ rating: 1, reasons: [], comment: '' })
    expect(parseRatingRequest({ ...base, rating: 'down', reasons: ['wrong', 'lang', 'wrong'], comment: '  не то  ' })).toMatchObject({ rating: -1, reasons: ['wrong', 'lang'], comment: 'не то' })
    expect(() => parseRatingRequest({ ...base, rating: 'meh' })).toThrow(RatingRequestError)
    expect(() => parseRatingRequest({ ...base, rating: 'down', reasons: ['rude'] })).toThrow(RatingRequestError)
  })

  it('длинное обрезает, кривое — в значение по умолчанию', () => {
    const e = parseRatingRequest({ ...base, answer: 'a'.repeat(MAX_ANSWER + 50), lang: 'de', channel: 'fax', firstMs: -5, soundMs: 1.5, screen: 'a b', model: 'x;drop', turn: -1, actions: ['x'.repeat(200), 5, '', 'b', 'c', 'd', 'e'] })
    expect(e.answer).toHaveLength(MAX_ANSWER)
    expect(e).toMatchObject({ lang: 'ru', channel: 'text', firstMs: null, soundMs: null, screen: null, model: null, turn: 0 })
    expect(e.actions).toHaveLength(4)
    expect(e.actions[0]).toHaveLength(80)
    expect(parseRatingRequest({ ...base, lang: 'kz' }).lang).toBe('kk')
  })
})

describe('scrubPersonal', () => {
  const user = { name: 'Айгерім Сапарова', phone: '77001234567', email: 'aigerim@mail.kz' }

  it('имя — со словоформой, почта и номер — любые', () => {
    const text = 'Айгерім, молодец! Айгерімге и Сапаровой пишу на aigerim@mail.kz или +7 (700) 123-45-67, а маме — other.mom@gmail.com, 8 777 765 43 21.'
    expect(scrubPersonal(text, user)).toBe('{имя}, молодец! {имя} и {имя} пишу на {почта} или {телефон}, а маме — {почта}, {телефон}.')
  })

  it('не трогает даты, счёт и слова, похожие на короткое имя', () => {
    expect(scrubPersonal('Срок 2026-11-08, балл 85 %, урок 12.', user)).toBe('Срок 2026-11-08, балл 85 %, урок 12.')
    expect(scrubPersonal('Аяз написал', { name: 'Ая' })).toBe('Аяз написал')
  })

  it('без имени в профиле — только контакты', () => {
    expect(scrubPersonal('Мой номер 87001112233', {})).toBe('Мой номер {телефон}')
    expect(scrubPersonal('', user)).toBe('')
  })
})

describe('actionKey', () => {
  it('у нажатия — подпись, у шага — вид задачи, у перерыва — минуты', () => {
    expect(actionKey({ kind: 'open', target: 'practice-speaking', now: false })).toBe('open:practice-speaking')
    expect(actionKey({ kind: 'click', target: '7', label: 'Далее', now: true })).toBe('click:Далее')
    expect(actionKey({ kind: 'step', task: { kind: 'course' } })).toBe('step:course')
    expect(actionKey({ kind: 'break', minutes: 10 })).toBe('break:10')
    expect(actionKey({ kind: 'open', target: 'feedback', feedback: { category: 'teacher' } })).toBe('open:feedback:teacher')
    expect(actionKey(null)).toBe('')
  })
})

it('hasFeedback — оценка, комментарий или нажатие', () => {
  expect(hasFeedback({ rating: null, comment: '', clicked: null })).toBe(false)
  expect(hasFeedback({ rating: -1 })).toBe(true)
  expect(hasFeedback({ rating: null, clicked: 'open:home' })).toBe(true)
})
