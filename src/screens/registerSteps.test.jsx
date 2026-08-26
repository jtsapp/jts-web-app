// @vitest-environment jsdom
// Шаги саморегистрации: номер и почта. В кадрах макета (4095:39839, 39875) у
// каждого шага есть кнопка «назад» — у номера и почты её не было вовсе, и уйти
// со шага можно было только кнопкой браузера.
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import RegisterPhonePage from './RegisterPhonePage.jsx'
import RegisterEmailPage from './RegisterEmailPage.jsx'

function renderStep(Page, props = {}) {
  return render(
    <I18nProvider>
      <Page onSubmit={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('шаги саморегистрации — «назад»', () => {
  for (const [name, Page] of [['номер', RegisterPhonePage], ['почта', RegisterEmailPage]]) {
    it(`${name}: кнопка есть и зовёт обработчик`, () => {
      const onBack = vi.fn()
      const { container } = renderStep(Page, { onBack })
      const back = container.querySelector('.back-btn')
      expect(back).not.toBeNull()
      fireEvent.click(back)
      expect(onBack).toHaveBeenCalled()
    })

    // Оболочка рисует кнопку только когда обработчик передан — на экранах без
    // возврата (например, после успешной регистрации) её быть не должно.
    it(`${name}: без обработчика кнопки нет`, () => {
      const { container } = renderStep(Page)
      expect(container.querySelector('.back-btn')).toBeNull()
    })
  }
})
