// @vitest-environment jsdom
// Ревью 08.10.2026, «Письмо»:
//  - пустое «Проверить» (или Enter, или «Go» на телефоне) тратило попытку, а
//    после трёх таких нажатий пункт закрывался «не решён» — верный ответ было
//    уже не ввести;
//  - задание на пунктуацию показывало числа без точек и запятых («38.2» как
//    «382») и не принимало типографский апостроф iPhone.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import { PunctuationTask } from './TypedTasks.jsx'

const GENRE = { id: 'g-test' }
const META = { rules: {} }
const TASK = {
  id: 't4',
  type: 'punctuation',
  items: [
    { id: 'pu0', raw: 'this morning the temperature was 382', answer: 'This morning the temperature was 38.2.', why: 'Full stop.' },
    { id: 'pu1', raw: 'we meet at five oclock', answer: "We meet at five o'clock.", why: 'Apostrophe.' },
  ],
}

function renderTask() {
  return render(
    <I18nProvider>
      <PunctuationTask genre={GENRE} task={TASK} meta={META} />
    </I18nProvider>,
  )
}
const inputs = (view) => [...view.container.querySelectorAll('textarea.wr-inp, input.wr-inp')]
const checks = () => screen.getAllByRole('button', { name: /Проверить/ })

describe('PunctuationTask', () => {
  beforeEach(() => localStorage.clear())

  it('подсказка показывает число как есть: 38.2, а не 382', () => {
    const view = renderTask()
    expect(view.container.querySelectorAll('.wr-src')[0].textContent).toBe('this morning the temperature was 38.2')
  })

  it('типографский апостроф с iPhone засчитывается', () => {
    const view = renderTask()
    fireEvent.change(inputs(view)[1], { target: { value: 'We meet at five o’clock.' } })
    fireEvent.click(checks()[1])
    expect(view.container.querySelectorAll('.wr-inp')[1].className).toMatch(/is-ok/)
  })

  it('пустая проверка не тратит попытку и кнопка неактивна', () => {
    const view = renderTask()
    expect(checks()[0].disabled).toBe(true)
    fireEvent.keyDown(inputs(view)[0], { key: 'Enter' })
    fireEvent.click(checks()[0])
    fireEvent.click(checks()[0])
    fireEvent.click(checks()[0])
    // Пункт не закрыт, поле живое — ответ ещё можно ввести.
    expect(inputs(view)[0].readOnly).toBe(false)
    fireEvent.change(inputs(view)[0], { target: { value: 'This morning the temperature was 38.2.' } })
    fireEvent.click(checks()[0])
    expect(view.container.querySelectorAll('.wr-inp')[0].className).toMatch(/is-ok/)
  })
})
