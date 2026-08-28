// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import RegisterPhonePage from './RegisterPhonePage.jsx'
import RegisterEmailPage from './RegisterEmailPage.jsx'
import RegisterBirthDatePage, { isValidBirthDate } from './RegisterBirthDatePage.jsx'

function renderStep(Page, props = {}) {
  return render(
    <I18nProvider>
      <Page onSubmit={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('isValidBirthDate', () => {
  it('принимает прошлую дату', () => {
    expect(isValidBirthDate('2000-05-15')).toBe(true)
  })
  it('отклоняет будущую дату', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    expect(isValidBirthDate(future.toISOString().slice(0, 10))).toBe(false)
  })
})

describe('шаги саморегистрации — «назад»', () => {
  for (const [name, Page] of [
    ['номер', RegisterPhonePage],
    ['почта', RegisterEmailPage],
    ['дата рождения', RegisterBirthDatePage],
  ]) {
    it(`${name}: кнопка есть и зовёт обработчик`, () => {
      const onBack = vi.fn()
      const { container } = renderStep(Page, { onBack })
      const back = container.querySelector('.back-btn')
      expect(back).not.toBeNull()
      fireEvent.click(back)
      expect(onBack).toHaveBeenCalled()
    })

    it(`${name}: без обработчика кнопки нет`, () => {
      const { container } = renderStep(Page)
      expect(container.querySelector('.back-btn')).toBeNull()
    })
  }
})

describe('дата рождения — сабмит', () => {
  it('не отправляет пустую форму', () => {
    const onSubmit = vi.fn()
    const { container } = renderStep(RegisterBirthDatePage, { onSubmit })
    fireEvent.submit(container.querySelector('form'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('отправляет валидную дату', () => {
    const onSubmit = vi.fn()
    const { container } = renderStep(RegisterBirthDatePage, { onSubmit })
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '1998-03-21' } })
    fireEvent.submit(container.querySelector('form'))
    expect(onSubmit).toHaveBeenCalledWith('1998-03-21')
  })
})
