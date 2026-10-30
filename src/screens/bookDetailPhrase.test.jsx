// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

// Читалка книг: выделенная фраза переводится целиком, а слово и фраза
// озвучиваются из карточки перевода. Раньше перевести можно было только одно
// слово тапом, выделение глушил общий запрет (styles.css), а 🔊 не было вовсе.

const getAudiobook = vi.fn()
vi.mock('../api.js', () => ({
  saveWord: vi.fn(),
  getAudiobook: (...a) => getAudiobook(...a),
}))
const translateWord = vi.fn(async (q) => ({ tr: q === 'ghost' ? 'призрак' : 'призрак шёл по коридору', alternates: [] }))
vi.mock('../lib/wordTranslate.js', async (orig) => ({
  ...(await orig()),
  translateWord: (...a) => translateWord(...a),
}))
const speak = vi.fn()
vi.mock('../practice/vocab/audio.js', () => ({ speak: (...a) => speak(...a) }))
vi.mock('../i18n.jsx', () => ({ useI18n: () => ({ lang: 'ru', t: (k) => k }) }))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: vi.fn() }))

const { default: BookDetail } = await import('./BookDetail.jsx')

const LONG =
  'The ghost walked the long corridor, and nobody in the old house in 1879 could hear a single step he made.'

let nextId = 1200
async function openChapter(text) {
  const id = nextId++
  getAudiobook.mockResolvedValue({ id, tracks: [{ trackIndex: 1, title: 'One', text }] })
  render(<BookDetail book={{ id, title: `Книга ${id}`, author: 'Oscar Wilde', tracks: [] }} token="DEMO" onBack={() => {}} />)
  fireEvent.click(await screen.findByText('Начать чтение'))
  await screen.findByText('ghost')
  return document.querySelector('.bk-read__text')
}

// Выделение от начала слова `from` до конца слова `to` (спаны .bk-w).
function select(from, to) {
  const words = [...document.querySelectorAll('.bk-w')]
  const a = words.find((w) => w.textContent === from)
  const b = words.find((w) => w.textContent === to)
  const range = document.createRange()
  range.setStart(a.firstChild, 0)
  range.setEnd(b.firstChild, b.textContent.length)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

beforeEach(() => {
  localStorage.clear()
  translateWord.mockClear()
  speak.mockClear()
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
  // В jsdom у Range нет раскладки; карточке нужен ненулевой прямоугольник.
  Range.prototype.getBoundingClientRect = () => ({ left: 10, top: 10, right: 90, bottom: 30, width: 80, height: 20 })
})
afterEach(() => {
  window.getSelection().removeAllRanges()
  cleanup()
})

describe('BookDetail — фраза и озвучка', () => {
  it('текст главы можно выделять: снят общий запрет', async () => {
    const article = await openChapter('The ghost walked the corridor.')
    expect(article.hasAttribute('data-selectable')).toBe(true)
  })

  it('выделенная фраза переводится целиком, и клик после протяжки карточку не закрывает', async () => {
    const article = await openChapter('The ghost walked the corridor.')
    select('The', 'corridor.')
    fireEvent.mouseUp(article)
    fireEvent.click(article)

    expect(await screen.findByText('призрак шёл по коридору')).toBeTruthy()
    expect(translateWord).toHaveBeenCalledWith('The ghost walked the corridor', 'ru')
    expect(document.querySelector('.bk-pop--phrase')).toBeTruthy()
  })

  it('🔊 произносит выделенную фразу', async () => {
    const article = await openChapter('The ghost walked the corridor.')
    select('ghost', 'walked')
    fireEvent.mouseUp(article)
    await screen.findByText('призрак шёл по коридору')

    fireEvent.click(screen.getByRole('button', { name: 'Произнести' }))
    expect(speak).toHaveBeenCalledWith('ghost walked')
  })

  it('🔊 есть и у слова, открытого тапом', async () => {
    await openChapter('The ghost walked the corridor.')
    fireEvent.click(screen.getByText('ghost'))
    await screen.findByText('призрак')

    fireEvent.click(screen.getByRole('button', { name: 'Произнести' }))
    expect(speak).toHaveBeenCalledWith('ghost')
  })

  it('фраза длиннее 100 знаков — подсказка про лимит, без запроса перевода', async () => {
    const article = await openChapter(LONG)
    select('The', 'made.')
    fireEvent.mouseUp(article)

    expect(await screen.findByText('lesson.phraseLimit')).toBeTruthy()
    expect(translateWord).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Произнести' })).toBeNull()
  })

  it('выделение пальцем разбирается после touchend', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const article = await openChapter('The ghost walked the corridor.')
      select('ghost', 'corridor.')
      fireEvent.touchEnd(article)
      expect(translateWord).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(80)
      expect(translateWord).toHaveBeenCalledWith('ghost walked the corridor', 'ru')
    } finally {
      vi.useRealTimers()
    }
  })
})
