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

const { default: ReadingKeywords } = await import('./ReadingKeywords.jsx')

const WORDS = [
  { en: 'placebo', tr: '/pləˈsiːbəʊ/', ru: 'плацебо', kz: 'плацебо', ex: 'A placebo is fake.' },
  { en: 'trial', tr: '/ˈtraɪəl/', ru: 'испытание', kz: 'сынақ', ex: 'They ran a trial.' },
]

function mount() {
  return render(
    <I18nProvider>
      <ReadingKeywords words={WORDS} token="tok" source="The Pill" />
    </I18nProvider>,
  )
}

beforeEach(() => {
  saveReadingKeyword.mockReset()
  saveReadingKeyword.mockResolvedValue(true)
})
afterEach(cleanup)

describe('ReadingKeywords — в словарь', () => {
  it('показывает книгу «добавить в словарь» у каждого слова', () => {
    const { getAllByRole } = mount()
    const buttons = getAllByRole('button', { name: 'Добавить в словарь' })
    expect(buttons).toHaveLength(WORDS.length)
  })

  it('по нажатию сохраняет слово и меняет кнопку на «уже в словаре»', async () => {
    const { getAllByRole, findByRole } = mount()
    fireEvent.click(getAllByRole('button', { name: 'Добавить в словарь' })[0])

    expect(saveReadingKeyword).toHaveBeenCalledWith('tok', WORDS[0], 'The Pill')
    expect(await findByRole('button', { name: 'Уже в словаре' })).toBeTruthy()
    expect(getAllByRole('button', { name: 'Добавить в словарь' })).toHaveLength(WORDS.length - 1)
  })

  it('если сохранить не вышло — кнопку снова можно нажать', async () => {
    saveReadingKeyword.mockResolvedValue(false)
    const { getAllByRole } = mount()
    const btn = getAllByRole('button', { name: 'Добавить в словарь' })[0]
    fireEvent.click(btn)

    await waitFor(() => expect(saveReadingKeyword).toHaveBeenCalled())
    expect(getAllByRole('button', { name: 'Добавить в словарь' })).toHaveLength(WORDS.length)
    expect(getAllByRole('button', { name: 'Добавить в словарь' })[0].disabled).toBe(false)
  })
})
