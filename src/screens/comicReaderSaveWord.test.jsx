// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

// Тот же баг 54, что у Книг (ревью 08.10.2026): у гостя читалка комиксов
// получает общий демо-токен Практики, и «В словарь» писало слово в словарь
// демо-аккаунта; сбой сохранения молча возвращал кнопку.

const saveWord = vi.fn()
vi.mock('../api.js', () => ({ saveWord: (...a) => saveWord(...a) }))
vi.mock('../lib/wordTranslate.js', async (orig) => ({
  ...(await orig()),
  translateWord: vi.fn(async () => ({ tr: 'призрак', alternates: [] })),
}))
vi.mock('../i18n.jsx', () => ({ useI18n: () => ({ lang: 'ru', t: (k) => k }) }))
vi.mock('../practice/comics/comicsData.js', () => ({
  loadComic: async () => ({
    title: 'The Ghost',
    pages: [{ src: 'p1.webp', blocks: [{ kind: 'speech', en: 'The ghost is here', ru: 'Призрак здесь' }] }],
  }),
  getComicPage: () => 1,
  setComicPage: () => {},
}))

const { default: ComicReader } = await import('./ComicReader.jsx')

async function openWord(token) {
  render(<ComicReader comic={{ id: 5, slug: 'ghost', title: 'The Ghost' }} token={token} onBack={() => {}} />)
  fireEvent.click(await screen.findByText('ghost'))
  await screen.findByText('призрак')
}

beforeEach(() => {
  localStorage.clear()
  saveWord.mockReset()
})
afterEach(cleanup)

describe('ComicReader — сохранение слова', () => {
  it('гость с демо-токеном видит «войдите», в общий словарь ничего не уходит', async () => {
    await openWord('DEMO')
    expect(screen.queryByRole('button', { name: 'comics.save' })).toBeNull()
    expect(screen.getByText('comics.saveLogin')).toBeTruthy()
    expect(saveWord).not.toHaveBeenCalled()
  })

  it('сбой сохранения виден, нажать можно ещё раз — своим токеном', async () => {
    localStorage.setItem('jts_access_token', 'USER')
    saveWord.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 1 })
    await openWord('USER')

    fireEvent.click(screen.getByRole('button', { name: 'comics.save' }))
    fireEvent.click(await screen.findByRole('button', { name: 'comics.saveFailed' }))
    expect(await screen.findByRole('button', { name: 'comics.saved' })).toBeTruthy()
    expect(saveWord.mock.calls.map((c) => c[0])).toEqual(['USER', 'USER'])
  })
})
