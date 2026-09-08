// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import BooksAudioFilter from './BooksAudioFilter.jsx'

// Счётчики приходят готовыми: их считает PracticePage через countByAudio.
const COUNTS = { all: 3, text: 1, audio: 2 }

function renderFilter(props = {}) {
  return render(
    <I18nProvider>
      <BooksAudioFilter value="all" onChange={() => {}} counts={COUNTS} {...props} />
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

  it('нулевой счётчик рисуется числом, а не пустым местом', () => {
    renderFilter({ counts: { all: 0, text: 0, audio: 0 } })
    expect(screen.getByRole('button', { name: /Аудио/ }).textContent).toContain('0')
  })

  // Ключи словаря собирались конкатенацией и не находились грепом; забытый
  // перевод вылезал бы в кнопке самим ключом.
  it('подписи берутся из словаря, а не печатают ключ', () => {
    renderFilter()
    for (const label of ['Все', 'Текст', 'Аудио']) {
      expect(screen.getByRole('button', { name: new RegExp(label) }).textContent).not.toContain(
        'practice.books',
      )
    }
  })
})
