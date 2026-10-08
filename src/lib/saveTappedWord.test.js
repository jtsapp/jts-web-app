import { describe, it, expect, vi, beforeEach } from 'vitest'

// Ревью 08.10.2026, баг 54: Книги и Комиксы сохраняли слово с токеном экрана, а
// у гостя это общий демо-токен Практики — слово попадало в словарь демо-
// аккаунта, один на всех гостей. Без демо-токена уходил «Bearer null», и
// кнопка молча откатывалась.

const session = { token: null }
const saveWord = vi.fn()
vi.mock('./session.js', () => ({ loadToken: () => session.token }))
vi.mock('../api.js', () => ({ saveWord: (...a) => saveWord(...a) }))

const { saveTappedWord } = await import('./saveTappedWord.js')

const FIELDS = { word: 'ghost', translation: 'призрак', language: 'ru', source: 'The Canterville Ghost' }

beforeEach(() => {
  session.token = null
  saveWord.mockReset()
})

describe('saveTappedWord', () => {
  it('гость — не сохраняет никуда, даже если у экрана есть демо-токен', async () => {
    expect(await saveTappedWord(FIELDS)).toEqual({ status: 'guest' })
    expect(saveWord).not.toHaveBeenCalled()
  })

  it('вошедший — в свой словарь, своим токеном', async () => {
    session.token = 'USER'
    saveWord.mockResolvedValue({ id: 7 })
    expect(await saveTappedWord(FIELDS)).toEqual({ status: 'saved', saved: { id: 7 } })
    expect(saveWord).toHaveBeenCalledWith('USER', FIELDS)
  })

  it('сбой сети — «не сохранилось», а не молчание', async () => {
    session.token = 'USER'
    saveWord.mockRejectedValue(new Error('offline'))
    expect(await saveTappedWord(FIELDS)).toEqual({ status: 'failed' })
  })
})
