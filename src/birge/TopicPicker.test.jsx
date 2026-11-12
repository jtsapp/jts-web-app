// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import TopicPicker from './TopicPicker.jsx'

afterEach(cleanup)

function mount(props = {}) {
  const onChange = vi.fn()
  render(
    <I18nProvider>
      <TopicPicker value="QUESTION" onChange={onChange} {...props} />
    </I18nProvider>,
  )
  return { onChange, button: screen.getByRole('button', { name: /^Тема/ }) }
}

describe('выбор темы ветки', () => {
  it('закрыт: кнопка с текущей темой, списка нет', () => {
    const { button } = mount()
    expect(button.getAttribute('aria-label')).toBe('Тема: Вопрос')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('клик открывает пять тем, текущая отмечена; выбор закрывает и возвращает фокус на кнопку', () => {
    const { onChange, button } = mount()
    fireEvent.click(button)
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Грамматика',
      'Speaking',
      'Словарь',
      'Мотивация',
      'Вопрос',
    ])
    expect(screen.getByRole('option', { name: 'Вопрос' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('option', { name: 'Speaking' }))
    expect(onChange).toHaveBeenCalledWith('SPEAKING')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('клавиатура: стрелка открывает на текущей, стрелки ходят, Enter выбирает', () => {
    const { onChange, button } = mount()
    fireEvent.keyDown(button, { key: 'ArrowDown' })
    expect(document.activeElement.textContent).toBe('Вопрос')
    const list = screen.getByRole('listbox')
    fireEvent.keyDown(list, { key: 'ArrowUp' })
    fireEvent.keyDown(list, { key: 'ArrowUp' })
    expect(document.activeElement.textContent).toBe('Словарь')
    fireEvent.keyDown(list, { key: 'Home' })
    expect(document.activeElement.textContent).toBe('Грамматика')
    fireEvent.keyDown(list, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('GRAMMAR')
  })

  it('Esc и нажатие мимо закрывают без выбора', () => {
    const { onChange, button } = mount()
    fireEvent.click(button)
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(button)

    fireEvent.click(button)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('пока форма публикует — кнопка выключена', () => {
    const { button } = mount({ disabled: true })
    expect(button.disabled).toBe(true)
  })
})
