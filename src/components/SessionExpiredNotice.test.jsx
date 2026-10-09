// @vitest-environment jsdom
// Плашка «Сессия истекла»: слова на трёх языках и обе кнопки.
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import SessionExpiredNotice from './SessionExpiredNotice.jsx'

function renderNotice(props = {}) {
  const onLogin = vi.fn()
  const onClose = vi.fn()
  const utils = render(
    <I18nProvider>
      <SessionExpiredNotice onLogin={onLogin} onClose={onClose} {...props} />
    </I18nProvider>,
  )
  return { ...utils, onLogin, onClose }
}

describe('SessionExpiredNotice', () => {
  it('говорит, что сессия истекла и надо войти заново', () => {
    const { getByRole } = renderNotice()

    // role=alert: скринридер зачитает сам, без фокуса на плашке.
    expect(getByRole('alert').textContent).toMatch(/Сессия истекла/)
    expect(getByRole('alert').textContent).toMatch(/Войдите в аккаунт заново/)
  })

  it('«Войти» зовёт onLogin и не закрывает сама', () => {
    const { getByRole, onLogin, onClose } = renderNotice()

    fireEvent.click(getByRole('button', { name: 'Войти' }))

    expect(onLogin).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('крестик зовёт onClose', () => {
    const { getByRole, onLogin, onClose } = renderNotice()

    fireEvent.click(getByRole('button', { name: 'Закрыть' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onLogin).not.toHaveBeenCalled()
  })
})
