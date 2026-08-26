// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'

// Книга, которой нет в статике public/practice/books, читается главами из
// админки: список каталога отдаёт треки без текста, поэтому читалка добирает
// его с detail-эндпоинта. Мокаем ровно этот вызов.
const getAudiobook = vi.fn()
vi.mock('../api.js', () => ({
  saveWord: vi.fn(),
  getAudiobook: (...args) => getAudiobook(...args),
}))
vi.mock('../i18n.jsx', () => ({ useI18n: () => ({ lang: 'ru', t: (k) => k }) }))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: vi.fn() }))

const { default: BookDetail } = await import('./BookDetail.jsx')

// Каждому тесту — своя книга: главы кэшируются в модуле по id книги (кэш
// живёт всю сессию и в проде, чтобы возврат к книге не ходил в сеть заново),
// поэтому переиспользование id тянуло бы в следующий тест чужие главы.
const book = (id) => ({ id, title: `Книга ${id}`, author: 'Oscar Wilde', tracks: [] })

beforeEach(() => {
  getAudiobook.mockReset()
  // Статика есть, но этой книги в ней нет — как у любой книги, заведённой
  // только в админке.
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
})

afterEach(() => {
  cleanup()
  vi.resetModules()
})

describe('BookDetail — книга из админки', () => {
  it('показывает главы и их текст, взятые с detail-эндпоинта', async () => {
    getAudiobook.mockResolvedValue({
      id: 43,
      title: 'Книга 43',
      tracks: [
        { trackIndex: 1, title: 'The Otis Family', text: 'When Mr. Otis bought the Chase.' },
        { trackIndex: 2, title: 'The Ghost Appears', text: 'The ghost walked the corridor.' },
      ],
    })
    render(<BookDetail book={book(43)} token="t" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText('The Otis Family')).toBeTruthy())
    expect(getAudiobook).toHaveBeenCalledWith('t', 43)
    expect(screen.getByText('The Ghost Appears')).toBeTruthy()
    // «0/2 глав» в прогрессе и «2 глав» в счётчике содержания.
    expect(screen.getAllByText(/2 глав/)).toHaveLength(2)
  })

  // Аудио у таких книг нет, и это не должно оставлять в кадре мёртвую кнопку.
  it('без audioUrl кнопку «Аудио» не рисует', async () => {
    getAudiobook.mockResolvedValue({
      id: 43,
      tracks: [{ trackIndex: 1, title: 'One', text: 'Текст главы.' }],
    })
    render(<BookDetail book={book(44)} token="t" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText('One')).toBeTruthy())
    expect(screen.queryByText(/Аудио/)).toBeNull()
    expect(screen.getByText('Начать чтение')).toBeTruthy()
  })

  // Книга, у которой в админке заведены только аудио-треки: detail вернёт их
  // без текста, и читалка обязана остаться на прежнем поведении, а не
  // подменить треки пустыми главами.
  it('треки без текста оставляют прежнее оглавление по аудио', async () => {
    const audioOnly = {
      ...book(45),
      tracks: [{ id: 1, title: 'Track one', audioUrl: 'a.mp3', durationLabel: '5:30' }],
    }
    getAudiobook.mockResolvedValue({ id: 45, tracks: [{ trackIndex: 1, title: 'Track one', audioUrl: 'a.mp3' }] })
    render(<BookDetail book={audioOnly} token="t" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText('Track one')).toBeTruthy())
    expect(screen.getByText('5:30')).toBeTruthy()
    expect(screen.getByText('🎧 Аудио')).toBeTruthy()
  })

  it('сбой сети не роняет экран — книга открывается без глав', async () => {
    getAudiobook.mockRejectedValue(new Error('offline'))
    render(<BookDetail book={book(46)} token="t" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText('Начать чтение')).toBeTruthy())
    expect(screen.getAllByText(/глав/).length).toBeGreaterThan(0)
  })
})
