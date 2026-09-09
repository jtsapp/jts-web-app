// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const saveReadingKeyword = vi.fn()
vi.mock('../../practice/reading/saveKeyword.js', () => ({
  saveReadingKeyword: (...args) => saveReadingKeyword(...args),
}))
vi.mock('../../practice/workbook/voice.js', () => ({
  speak: vi.fn(),
}))

const { default: ReadingArticle } = await import('./ReadingArticle.jsx')

const TEXT = {
  title: 'The Pill',
  text: ['Take the pill.'],
  words: [{ en: 'Take', tr: '/teɪk/', ru: 'брать', kz: 'алу', ex: 'Take the pill.' }],
}

function mount() {
  return render(
    <I18nProvider>
      <ReadingArticle text={TEXT} dict={null} ensureDict={() => Promise.resolve(null)} token="tok" />
    </I18nProvider>,
  )
}

beforeEach(() => {
  saveReadingKeyword.mockReset()
  saveReadingKeyword.mockResolvedValue(true)
})
afterEach(cleanup)

describe('ReadingArticle — попап перевода', () => {
  it('на карточке слова есть кнопка «Добавить в словарь»', async () => {
    const { getByText, findByRole } = mount()
    fireEvent.click(getByText('Take'))
    expect(await findByRole('button', { name: 'Добавить в словарь' })).toBeTruthy()
  })

  it('сохраняет слово из попапа', async () => {
    const { getByText, findByRole } = mount()
    fireEvent.click(getByText('Take'))
    fireEvent.click(await findByRole('button', { name: 'Добавить в словарь' }))
    await waitFor(() => expect(saveReadingKeyword).toHaveBeenCalled())
    expect(saveReadingKeyword).toHaveBeenCalledWith(
      'tok',
      { en: 'Take', ru: 'брать', kz: 'алу' },
      'The Pill',
    )
    expect(await findByRole('button', { name: 'Уже в словаре' })).toBeTruthy()
  })
})
