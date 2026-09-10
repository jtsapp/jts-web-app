// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import TutorLimitModal from './TutorLimitModal.jsx'
import PurchaseSuccessModal from './PurchaseSuccessModal.jsx'

function renderLimit(props = {}) {
  const onBack = vi.fn()
  const onBuy = vi.fn()
  const view = render(
    <I18nProvider>
      <TutorLimitModal kind="daily" limitSec={1200} onBack={onBack} onBuy={onBuy} {...props} />
    </I18nProvider>,
  )
  return { ...view, onBack, onBuy }
}

describe('Лимит тьютора', () => {
  it('заголовок, минуты из ответа сервера и две кнопки', () => {
    renderLimit()
    expect(screen.getByText('Лимит исчерпан')).toBeTruthy()
    expect(screen.getByText('Вы использовали бесплатные 20 мин общения с тьютором.')).toBeTruthy()
    expect(screen.getByText('Вернуться')).toBeTruthy()
    expect(screen.getByText('Докупить минуты')).toBeTruthy()
  })

  // Число берётся с сервера: у ученика может стоять свой лимит от тарифа.
  it('другой лимит — другое число в подписи', () => {
    renderLimit({ limitSec: 1800 })
    expect(screen.getByText('Вы использовали бесплатные 30 мин общения с тьютором.')).toBeTruthy()
  })

  it('месячный лимит говорит про месяц', () => {
    renderLimit({ kind: 'monthly', limitSec: 18000 })
    expect(screen.getByText('Вы использовали 300 мин общения с тьютором в этом месяце.')).toBeTruthy()
  })

  // Пул минут тарифа кончился — «приходите завтра» тут было бы неправдой, и
  // упрекать человека числом тоже незачем.
  it('пул тарифа — без числа', () => {
    renderLimit({ kind: 'total', limitSec: 18000 })
    expect(screen.getByText('Минуты тьютора в вашем тарифе закончились.')).toBeTruthy()
  })

  it('кнопки зовут свои обработчики', () => {
    const { onBack, onBuy } = renderLimit()
    fireEvent.click(screen.getByText('Докупить минуты'))
    expect(onBuy).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Вернуться'))
    expect(onBack).toHaveBeenCalled()
  })

  it('Esc и клик по подложке закрывают окно', () => {
    const { container, onBack } = renderLimit()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.lm-over'))
    expect(onBack).toHaveBeenCalledTimes(2)
  })

  // Под окном лежит экран, на котором нажимать нечего: Tab не должен туда уводить.
  it('фокус заперт внутри окна', () => {
    const { container } = renderLimit()
    const nodes = [...container.querySelectorAll('.lm-card button')]
    expect(document.activeElement).toBe(nodes[0])
    nodes[nodes.length - 1].focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(nodes[0])
  })

  it('иллюстрация локальная и декоративная', () => {
    const { container } = renderLimit()
    const art = container.querySelector('.lm-art img')
    expect(art.getAttribute('src').startsWith('/')).toBe(true)
    expect(art.getAttribute('alt')).toBe('')
  })
})

describe('Поздравление с покупкой', () => {
  it('заголовок, обе строки и кнопка', () => {
    const onClose = vi.fn()
    render(
      <I18nProvider>
        <PurchaseSuccessModal onClose={onClose} />
      </I18nProvider>,
    )
    expect(screen.getByText('Поздравляем с покупкой!')).toBeTruthy()
    expect(screen.getByText(/Оплата успешно произведена/)).toBeTruthy()
    expect(screen.getByText(/новые способы обучения/)).toBeTruthy()
    fireEvent.click(screen.getByText('Отлично'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Esc закрывает', () => {
    const onClose = vi.fn()
    render(
      <I18nProvider>
        <PurchaseSuccessModal onClose={onClose} />
      </I18nProvider>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
