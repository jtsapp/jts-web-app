// Журнал оценок со стороны окна: когда пишет, что шлёт и что seq растёт с каждой отправкой.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { actionKeys, createRatingBook, newRatingId, ratingEnabled } from './ratingClient.js'

let fetchMock
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response('{"saved":true}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete globalThis.__jtsRating
})

const sentBodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))

it('в vitest журнал молчит, пока тест его не включит', async () => {
  expect(ratingEnabled()).toBe(false)
  const book = createRatingBook()
  await book.open('r0123456789abc', { chat: 'c0123456789abc', question: 'q', answer: 'a' }, 'tok')
  expect(fetchMock).not.toHaveBeenCalled()
  globalThis.__jtsRating = true
  expect(ratingEnabled()).toBe(true)
})

describe('createRatingBook', () => {
  beforeEach(() => {
    globalThis.__jtsRating = true
  })

  it('open шлёт запись сразу, patch + send — её же с новым seq', async () => {
    const book = createRatingBook()
    await book.open('r0123456789abc', { chat: 'c0123456789abc', turn: 1, question: 'Где домашка?', answer: 'В «Уроках».', actions: ['open:lessons'] }, 'tok')
    book.patch('r0123456789abc', { rating: 'down', reasons: ['wrong'] })
    await book.send('r0123456789abc', 'tok')
    const [first, second] = sentBodies()
    expect(first).toMatchObject({ id: 'r0123456789abc', seq: 1, rating: null, actions: ['open:lessons'] })
    expect(first).not.toHaveProperty('sent')
    expect(second).toMatchObject({ seq: 2, rating: 'down', reasons: ['wrong'], question: 'Где домашка?' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/assistant/rating')
    expect(init.headers.authorization).toBe('Bearer tok')
    expect(init.keepalive).toBe(true)
  })

  it('без токена, без записи и при сбое сети — тихо false', async () => {
    const book = createRatingBook()
    expect(await book.open('r0123456789abc', {}, null)).toBe(false)
    expect(await book.send('r-unknown-0000', 'tok')).toBe(false)
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    expect(await book.open('r0123456789abd', {}, 'tok')).toBe(false)
    expect(book.patch('r-unknown-0000', { rating: 'up' })).toBe(null)
  })

  it('держит последние 200 ответов', async () => {
    const book = createRatingBook()
    for (let i = 0; i < 205; i++) await book.open(`r-answer-${String(i).padStart(4, '0')}`, {}, 'tok')
    expect(book.get('r-answer-0000')).toBe(null)
    expect(book.get('r-answer-0204')).not.toBe(null)
  })
})

it('newRatingId — в алфавите роута и не повторяется', () => {
  const ids = new Set(Array.from({ length: 50 }, () => newRatingId()))
  expect(ids.size).toBe(50)
  for (const id of ids) expect(id).toMatch(/^r[a-z0-9]{8,47}$/)
  expect(newRatingId('c')).toMatch(/^c/)
})

it('actionKeys — ключи кнопок ответа', () => {
  expect(actionKeys([{ kind: 'open', target: 'practice' }, null, { kind: 'click', label: 'Далее', target: '3' }])).toEqual(['open:practice', 'click:Далее'])
})
