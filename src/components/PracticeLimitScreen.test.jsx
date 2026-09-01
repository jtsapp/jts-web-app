// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import PracticeLimitScreen from './PracticeLimitScreen.jsx'

const PAYWALL = 'Данная функция доступна по подписке'

function renderLimit(props) {
  const onBack = vi.fn()
  const view = render(
    <I18nProvider>
      <PracticeLimitScreen limit={3} onBack={onBack} {...props} />
    </I18nProvider>,
  )
  return { ...view, onBack }
}

describe('PracticeLimitScreen — плашка про подписку только для демо', () => {
  it('демо-ученик на исчерпанном лимите видит плашку, а не заглушку', () => {
    const { container } = renderLimit({ source: 'DEMO', isDemoAccount: true })
    expect(screen.getByText(PAYWALL)).toBeTruthy()
    expect(container.querySelector('.pl-limit')).toBe(null)
  })

  // source приходит не всегда (старый стенд отдаёт NONE) — тогда демо
  // определяется флагом аккаунта, и плашка обязана быть та же.
  it('демо-аккаунт без явного source — тоже плашка', () => {
    renderLimit({ source: 'NONE', isDemoAccount: true })
    expect(screen.getByText(PAYWALL)).toBeTruthy()
  })

  // Человек уже платит: предлагать ему купить подписку — бессмыслица, и причина
  // отказа у него другая.
  it('лимит абонемента показывает прежний текст, а не плашку', () => {
    const { container } = renderLimit({ source: 'PLAN', sourceName: 'Стандарт', isDemoAccount: false })
    expect(screen.queryByText(PAYWALL)).toBe(null)
    expect(container.querySelector('.pl-limit__body').textContent)
      .toBe('Лимит абонемента «Стандарт»: доступно до 3. Чтобы расширить доступ, обновите абонемент или обратитесь к куратору.')
  })

  it('лимит подписки показывает прежний текст, а не плашку', () => {
    const { container } = renderLimit({ source: 'SUBSCRIPTION', sourceName: 'Премиум', isDemoAccount: false })
    expect(screen.queryByText(PAYWALL)).toBe(null)
    expect(container.querySelector('.pl-limit__body').textContent)
      .toBe('Лимит подписки «Премиум»: доступно до 3. Чтобы расширить доступ, обновите подписку или обратитесь к куратору.')
  })

  it('точечная квота куратора показывает прежний текст, а не плашку', () => {
    const { container } = renderLimit({ source: 'STUDENT', isDemoAccount: false })
    expect(screen.queryByText(PAYWALL)).toBe(null)
    expect(container.querySelector('.pl-limit')).toBeTruthy()
  })

  // «Вернуться» и Esc обязаны вести туда же, куда вела «Назад» заглушки, —
  // это один и тот же onBack вызывающего экрана.
  it('«Вернуться» и Esc уводят туда же, куда «Назад»', () => {
    const { onBack } = renderLimit({ source: 'DEMO', isDemoAccount: true })
    fireEvent.click(screen.getByText('Вернуться'))
    expect(onBack).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(2)
  })
})
