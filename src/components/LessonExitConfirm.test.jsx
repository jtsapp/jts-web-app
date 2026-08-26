// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LessonExitConfirm from './LessonExitConfirm.jsx'

function renderConfirm() {
  const onStay = vi.fn()
  const onLeave = vi.fn()
  const view = render(
    <I18nProvider>
      <LessonExitConfirm onStay={onStay} onLeave={onLeave} />
    </I18nProvider>
  )
  return { ...view, onStay, onLeave }
}

describe('LessonExitConfirm — подтверждение выхода из урока', () => {
  it('вопрос, подпись и две кнопки из макета', () => {
    renderConfirm()
    expect(screen.getByText('Вы уверены что хотите выйти?')).toBeTruthy()
    expect(screen.getByText('Урок не будет завершен')).toBeTruthy()
    expect(screen.getByText('Выйти из урока')).toBeTruthy()
    expect(screen.getByText('Отменить')).toBeTruthy()
  })

  it('«Выйти из урока» уводит, «Отменить» оставляет', () => {
    const { onStay, onLeave } = renderConfirm()
    fireEvent.click(screen.getByText('Выйти из урока'))
    expect(onLeave).toHaveBeenCalledTimes(1)
    expect(onStay).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Отменить'))
    expect(onStay).toHaveBeenCalledTimes(1)
  })

  it('крестик и клик по подложке закрывают диалог, а клик по карточке — нет', () => {
    const { container, onStay, onLeave } = renderConfirm()
    fireEvent.click(container.querySelector('.lx-close'))
    fireEvent.click(container.querySelector('.lx-over'))
    expect(onStay).toHaveBeenCalledTimes(2)

    fireEvent.click(container.querySelector('.lx-card'))
    expect(onStay).toHaveBeenCalledTimes(2)
    expect(onLeave).not.toHaveBeenCalled()
  })

  it('Esc закрывает диалог', () => {
    const { onStay } = renderConfirm()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onStay).toHaveBeenCalledTimes(1)
  })

  // Кнопка выхода стоит первой и залита акцентом — значит Enter по инерции
  // выбрасывал бы из урока. Фокус при открытии уходит на «Отменить».
  it('фокус открытого диалога стоит на «Отменить»', () => {
    renderConfirm()
    expect(document.activeElement.textContent).toBe('Отменить')
  })

  it('диалог объявлен модальным и подписан своим заголовком', () => {
    const { container } = renderConfirm()
    const dialog = container.querySelector('.lx-card')
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent)
      .toBe('Вы уверены что хотите выйти?')
  })
})
