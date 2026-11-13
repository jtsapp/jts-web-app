// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const searchDictionary = vi.fn()
const getSavedWords = vi.fn()
const saveWord = vi.fn()
vi.mock('../../api.js', () => ({
  searchDictionary: (...args) => searchDictionary(...args),
  getSavedWords: (...args) => getSavedWords(...args),
  saveWord: (...args) => saveWord(...args),
}))
const translateWord = vi.fn()
vi.mock('../../lib/wordTranslate.js', async (importOriginal) => ({
  ...(await importOriginal()),
  translateWord: (...args) => translateWord(...args),
}))

const { default: LessonDictionary } = await import('./LessonDictionary.jsx')

/**
 * Обратный словарь (просьба 12.11.2026): ученик набирает «витрина» и получает
 * английское слово. Раньше перевод шёл только с английского, и карточка
 * показывала «витрина — витрина».
 */
function mount() {
  return render(
    <I18nProvider>
      <LessonDictionary token="TOK" defaultOpen />
    </I18nProvider>,
  )
}

function type(container, text) {
  fireEvent.change(container.querySelector('.lw-dict__search input'), { target: { value: text } })
}

beforeEach(() => {
  searchDictionary.mockReset().mockResolvedValue([])
  getSavedWords.mockReset().mockResolvedValue([])
  saveWord.mockReset().mockResolvedValue({})
  translateWord.mockReset().mockImplementation(async (word, tl) => (
    tl === 'en' ? { tr: 'shop window', alternates: ['showcase'] } : { tr: word, alternates: [] }
  ))
})
afterEach(cleanup)

describe('Словарь в уроке — поиск по-русски', () => {
  it('русское слово переводится на английский, карточка «английское — русское»', async () => {
    const { container } = mount()
    type(container, 'витрина')

    await waitFor(() => expect(container.querySelector('.lw-dict__fallback')).not.toBeNull())
    expect(translateWord).toHaveBeenCalledWith('витрина', 'en')
    const card = container.querySelector('.lw-dict__fallback')
    expect(card.querySelector('.lw-dict__word').textContent).toContain('shop window')
    expect(card.querySelector('.lw-dict__tr').textContent).toBe('витрина')
  })

  it('в словарь уходит английское слово с русским переводом, без английских синонимов', async () => {
    const { container } = mount()
    type(container, 'витрина')
    await waitFor(() => expect(container.querySelector('.lw-dict__save')).not.toBeNull())

    fireEvent.click(container.querySelector('.lw-dict__save'))

    await waitFor(() => expect(saveWord).toHaveBeenCalled())
    const body = saveWord.mock.calls[0][1]
    expect(body.word).toBe('shop window')
    expect(body.translation).toBe('витрина')
    expect(body.alternates).toBeUndefined()
  })

  it('перевод, вернувший то же слово, карточку не рисует', async () => {
    translateWord.mockResolvedValue({ tr: 'витрина', alternates: [] })
    const { container } = mount()
    type(container, 'витрина')

    await waitFor(() => expect(translateWord).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    expect(container.querySelector('.lw-dict__fallback')).toBeNull()
  })

  it('английское слово по-прежнему переводится на русский', async () => {
    const { container } = mount()
    type(container, 'awkward')

    await waitFor(() => expect(translateWord).toHaveBeenCalledWith('awkward', 'ru'))
  })
})
