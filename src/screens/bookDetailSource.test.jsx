// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'

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
    // Эмодзи кнопки — отдельный aria-hidden span (на телефоне вместо него
    // иконка макета), поэтому ищем кнопку по доступному имени.
    expect(screen.getByRole('button', { name: /Аудио/ })).toBeTruthy()
  })

  it('сбой сети не роняет экран — книга открывается без глав', async () => {
    getAudiobook.mockRejectedValue(new Error('offline'))
    render(<BookDetail book={book(46)} token="t" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText('Начать чтение')).toBeTruthy())
    expect(screen.getAllByText(/глав/).length).toBeGreaterThan(0)
  })

  // Загруженный PDF больше не открывается просмотрщиком: кнопка и оглавление
  // те же, что у остальных книжек, главы приезжают текстом с бэкенда.
  it('книга с файлом PDF читается главами, а не кнопкой «Читать книгу»', async () => {
    getAudiobook.mockResolvedValue({
      id: 47,
      tracks: [
        { trackIndex: 1, title: 'The Otis Family', text: 'When Mr. Otis bought the Chase.' },
        { trackIndex: 2, title: 'The Ghost Appears', text: 'The ghost walked the corridor.' },
      ],
    })
    render(<BookDetail book={{ ...book(47), bookFileUrl: 'https://files.example/book.pdf' }} token="t" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText('The Otis Family')).toBeTruthy())
    expect(screen.getByText('Начать чтение')).toBeTruthy()
    expect(screen.queryByText('Читать книгу')).toBeNull()
  })
})

describe('BookDetail — полоса чтения и субтитры', () => {
  // Читалка мотает окно наверх при смене главы, а jsdom прокрутки не умеет и
  // сыплет «Not implemented» в вывод.
  beforeEach(() => {
    window.scrollTo = vi.fn()
  })

  // Полоса живёт в портале body и на телефоне плавает внизу экрана; в jsdom
  // размеров нет, поэтому проверяем, что она есть и честно стоит на нуле.
  it('в режиме чтения рисует полосу прогресса главы', async () => {
    getAudiobook.mockResolvedValue({
      id: 48,
      tracks: [{ trackIndex: 1, title: 'One', text: 'Первое предложение. Второе.' }],
    })
    render(<BookDetail book={book(48)} token="t" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('One')).toBeTruthy())
    fireEvent.click(screen.getByText('Начать чтение'))

    const bar = await screen.findByRole('progressbar', { name: 'books.readProgress' })
    expect(bar.getAttribute('aria-valuenow')).toBe('0')
    expect(bar.parentElement).toBe(document.body)
  })

  it('у главы без текста полосы нет', async () => {
    const audioOnly = { ...book(49), tracks: [{ id: 1, title: 'Track one', audioUrl: 'a.mp3' }] }
    getAudiobook.mockResolvedValue({ id: 49, tracks: [{ id: 1, trackIndex: 1, title: 'Track one', audioUrl: 'a.mp3' }] })
    render(<BookDetail book={audioOnly} token="t" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('Track one')).toBeTruthy())
    fireEvent.click(screen.getByText('Начать чтение'))

    await screen.findByText(/Текст этой главы ещё не добавлен/)
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  // Субтитры — текст того же трека с detail-эндпоинта (у трека в списке
  // каталога текста нет).
  it('в аудио показывает субтитры из текста трека', async () => {
    const withAudio = { ...book(50), tracks: [{ id: 5, title: 'Глава 1', audioUrl: 'a.mp3' }] }
    getAudiobook.mockResolvedValue({
      id: 50,
      tracks: [{ id: 5, trackIndex: 1, title: 'Глава 1', audioUrl: 'a.mp3', text: 'The universe had a beginning. And so on.' }],
    })
    render(<BookDetail book={withAudio} token="t" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Аудио/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Аудио/ }))

    await screen.findByText('books.subtitles')
    expect(screen.getByText(/The universe had a beginning\./)).toBeTruthy()
    // До старта ничего не «прозвучало».
    expect(document.querySelectorAll('.bk-subs .is-said')).toHaveLength(0)
  })

  it('трек без текста — карточки субтитров нет', async () => {
    const withAudio = { ...book(51), tracks: [{ id: 6, title: 'Глава 1', audioUrl: 'a.mp3' }] }
    getAudiobook.mockResolvedValue({ id: 51, tracks: [{ id: 6, trackIndex: 1, title: 'Глава 1', audioUrl: 'a.mp3' }] })
    render(<BookDetail book={withAudio} token="t" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Аудио/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Аудио/ }))

    await waitFor(() => expect(getAudiobook).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('books.subtitles')).toBeNull()
  })
})
