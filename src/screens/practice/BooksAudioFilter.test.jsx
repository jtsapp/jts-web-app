// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import BooksAudioFilter from './BooksAudioFilter.jsx'

const CATALOG = [
  { id: 1, title: 'Alice', tracks: [{ audioUrl: 'a1.mp3' }] },
  { id: 2, title: 'Dracula', audioUrl: 'd.mp3' },
  { id: 43, title: 'The Canterville Ghost', tracks: [{ audioUrl: '' }] },
]

function renderFilter(props = {}) {
  return render(
    <I18nProvider>
      <BooksAudioFilter value="all" onChange={() => {}} books={CATALOG} {...props} />
    </I18nProvider>,
  )
}

describe('BooksAudioFilter', () => {
  it('показывает три режима и сколько книг в каждом', () => {
    renderFilter()
    expect(screen.getByRole('button', { name: /Все/ }).textContent).toContain('3')
    expect(screen.getByRole('button', { name: /Текст/ }).textContent).toContain('1')
    expect(screen.getByRole('button', { name: /Аудио/ }).textContent).toContain('2')
  })

  it('выбранный режим озвучен как нажатый — остальные как ненажатые', () => {
    renderFilter({ value: 'audio' })
    expect(screen.getByRole('button', { name: /Аудио/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Все/ }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: /Текст/ }).getAttribute('aria-pressed')).toBe('false')
  })

  it('клик сообщает выбранный режим наверх', () => {
    const onChange = vi.fn()
    renderFilter({ onChange })
    fireEvent.click(screen.getByRole('button', { name: /Текст/ }))
    expect(onChange).toHaveBeenCalledWith('text')
  })

  it('группа подписана — скринридер объявляет, что это за кнопки', () => {
    renderFilter()
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('Книжки по наличию озвучки')
  })

  it('пустой каталог рисует нули, а не пустые подписи', () => {
    renderFilter({ books: [] })
    expect(screen.getByRole('button', { name: /Аудио/ }).textContent).toContain('0')
  })
})
