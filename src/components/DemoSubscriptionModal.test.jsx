// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import DemoSubscriptionModal from './DemoSubscriptionModal.jsx'

const TITLE = 'Данная функция доступна по подписке'
const BODY =
  'Сейчас вы используете демо-аккаунт. Приобретите подписку, чтобы получить доступ к этому разделу и другим возможностям сервиса.'

function renderModal() {
  const onClose = vi.fn()
  const view = render(
    <I18nProvider>
      <DemoSubscriptionModal onClose={onClose} />
    </I18nProvider>,
  )
  return { ...view, onClose }
}

describe('DemoSubscriptionModal — плашка «доступно по подписке»', () => {
  it('иллюстрация, заголовок, текст и две кнопки', () => {
    const { container } = renderModal()
    expect(container.querySelector('.ds-art')).toBeTruthy()
    expect(screen.getByText(TITLE)).toBeTruthy()
    expect(screen.getByText(BODY)).toBeTruthy()
    expect(screen.getByText('Вернуться')).toBeTruthy()
    expect(screen.getByText('Приобрести подписку')).toBeTruthy()
  })

  // Своей картинки «подписка» в public/ нет и внешнюю тянуть нельзя — берём
  // маскота приложения. Проверяем именно локальный путь: внешний адрес в
  // вёрстке недопустим.
  it('иллюстрация локальная и декоративная', () => {
    const { container } = renderModal()
    const art = container.querySelector('.ds-art')
    expect(art.getAttribute('src').startsWith('/')).toBe(true)
    expect(art.getAttribute('alt')).toBe('')
  })

  it('«Вернуться», Esc и клик по подложке закрывают окно, клик по карточке — нет', () => {
    const { container, onClose } = renderModal()
    fireEvent.click(screen.getByText('Вернуться'))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.click(container.querySelector('.ds-over'))
    expect(onClose).toHaveBeenCalledTimes(3)

    fireEvent.click(container.querySelector('.ds-card'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  // Покупки подписки в приложении нет, поэтому кнопка обязана вести туда, где
  // её правда оформляют: в поддержку. Кнопка, ведущая в никуда, читается как
  // сломанная оплата.
  it('«Приобрести подписку» — ссылка в поддержку, в новой вкладке', () => {
    renderModal()
    const buy = screen.getByText('Приобрести подписку')
    expect(buy.tagName).toBe('A')
    expect(buy.getAttribute('href')).toBe(SUPPORT_WHATSAPP_URL)
    expect(buy.getAttribute('target')).toBe('_blank')
    expect(buy.getAttribute('rel')).toContain('noopener')
  })

  it('окно объявлено модальным и подписано своим заголовком', () => {
    const { container } = renderModal()
    const dialog = container.querySelector('.ds-card')
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent).toBe(TITLE)
    expect(document.getElementById(dialog.getAttribute('aria-describedby')).textContent).toBe(BODY)
  })

  // Вторая кнопка уводит на WhatsApp в новой вкладке — Enter по инерции
  // выдёргивал бы человека из приложения. Фокус уходит на «Вернуться».
  it('фокус открытого окна стоит на «Вернуться»', () => {
    renderModal()
    expect(document.activeElement.textContent).toBe('Вернуться')
  })

  it('Tab не выпускает фокус из окна', () => {
    const { container } = renderModal()
    const back = screen.getByText('Вернуться')
    const buy = screen.getByText('Приобрести подписку')

    // С последнего элемента вперёд — на первый, с первого назад — на последний.
    buy.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(back)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(buy)

    // Фокус вне окна (клик по подложке снимает его с кнопок) — возвращаем.
    container.querySelector('.ds-over').focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(back)
  })
})
