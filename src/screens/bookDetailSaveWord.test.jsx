// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

// «Сохранить в словарь» в окне перевода книги (ревью 08.10.2026, баг 54): гость
// писал слово в общий словарь демо-аккаунта, а сбой сохранения молча
// возвращал кнопку, будто нажатия не было.

const getAudiobook = vi.fn()
const saveWord = vi.fn()
vi.mock('../api.js', () => ({
  saveWord: (...a) => saveWord(...a),
  getAudiobook: (...a) => getAudiobook(...a),
}))
vi.mock('../lib/wordTranslate.js', async (orig) => ({
  ...(await orig()),
  translateWord: vi.fn(async () => ({ tr: 'призрак', alternates: [] })),
}))
vi.mock('../i18n.jsx', () => ({ useI18n: () => ({ lang: 'ru', t: (k) => k }) }))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: vi.fn() }))

const { default: BookDetail } = await import('./BookDetail.jsx')

let nextId = 900
async function openWord(token) {
  const id = nextId++
  getAudiobook.mockResolvedValue({ id, tracks: [{ trackIndex: 1, title: 'One', text: 'The ghost walked the corridor.' }] })
  render(<BookDetail book={{ id, title: `Книга ${id}`, author: 'Oscar Wilde', tracks: [] }} token={token} onBack={() => {}} />)
  fireEvent.click(await screen.findByText('Начать чтение'))
  fireEvent.click(await screen.findByText('ghost'))
  await screen.findByText('призрак')
}

beforeEach(() => {
  localStorage.clear()
  saveWord.mockReset()
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
})
afterEach(cleanup)

describe('BookDetail — сохранение слова', () => {
  it('гость с демо-токеном видит «войдите», и в общий словарь ничего не уходит', async () => {
    await openWord('DEMO')
    expect(screen.queryByRole('button', { name: /Сохранить в словарь/ })).toBeNull()
    expect(screen.getByText(/Войдите, чтобы сохранять слова/)).toBeTruthy()
    expect(saveWord).not.toHaveBeenCalled()
  })

  it('сбой сохранения виден, и нажать можно ещё раз', async () => {
    localStorage.setItem('jts_access_token', 'USER')
    saveWord.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 1 })
    await openWord('USER')

    fireEvent.click(screen.getByRole('button', { name: /Сохранить в словарь/ }))
    const retry = await screen.findByRole('button', { name: /Не сохранилось/ })
    fireEvent.click(retry)
    expect(await screen.findByRole('button', { name: /В словаре/ })).toBeTruthy()
    expect(saveWord).toHaveBeenCalledTimes(2)
    expect(saveWord.mock.calls[0][0]).toBe('USER')
  })
})
