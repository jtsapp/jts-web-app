// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import StepNav from './StepNav.jsx'

const STEPS = [
  { id: 's1', order: 1, title: 'Разминка' },
  { id: 's2', order: 2, title: 'Слова' },
  { id: 's3', order: 3, title: 'Практика' },
]

function renderNav(props = {}) {
  const onSelect = vi.fn()
  const view = render(
    <I18nProvider>
      <StepNav steps={STEPS} activeStepId="s2" onSelect={onSelect} {...props} />
    </I18nProvider>
  )
  return { ...view, onSelect }
}

describe('StepNav — переход по шагам кнопками', () => {
  it('«Далее» ведёт на следующий шаг, «Назад» — на предыдущий', () => {
    const { container, onSelect } = renderNav()
    const [prev, next] = container.querySelectorAll('.lw-stepnav__btn')

    fireEvent.click(next)
    expect(onSelect).toHaveBeenCalledWith('s3')

    fireEvent.click(prev)
    expect(onSelect).toHaveBeenCalledWith('s1')
  })

  it('показывает, где ученик находится', () => {
    const { container } = renderNav()
    expect(container.querySelector('.lw-stepnav__pos').textContent).toBe('Шаг 2 из 3')
  })

  it('на первом шаге назад некуда, на последнем — вперёд', () => {
    const first = renderNav({ activeStepId: 's1' })
    const [prevFirst, nextFirst] = first.container.querySelectorAll('.lw-stepnav__btn')
    expect(prevFirst.disabled).toBe(true)
    expect(nextFirst.disabled).toBe(false)

    const last = renderNav({ activeStepId: 's3' })
    const [prevLast, nextLast] = last.container.querySelectorAll('.lw-stepnav__btn')
    expect(prevLast.disabled).toBe(false)
    expect(nextLast.disabled).toBe(true)
  })

  // §0.6: элемента, который выглядит рабочим и не работает, на экране нет.
  it('вести некуда — кнопок нет вовсе', () => {
    expect(renderNav({ steps: [STEPS[0]], activeStepId: 's1' }).container.querySelector('.lw-stepnav')).toBeNull()
    expect(renderNav({ steps: [] }).container.querySelector('.lw-stepnav')).toBeNull()
    // Шаг ещё не выбран — вести не от чего.
    expect(renderNav({ activeStepId: null }).container.querySelector('.lw-stepnav')).toBeNull()
  })

  it('неизвестный активный шаг не роняет навигацию', () => {
    expect(renderNav({ activeStepId: 'нет-такого' }).container.querySelector('.lw-stepnav')).toBeNull()
  })
})

describe('StepNav — завершение урока', () => {
  it('на последнем шаге предлагает завершить, а не гаснет', () => {
    const onFinish = vi.fn()
    const { getByRole } = renderNav({ activeStepId: STEPS[STEPS.length - 1].id, onFinish })
    const btn = getByRole('button', { name: /Завершить/i })
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect(onFinish).toHaveBeenCalled()
  })

  it('без обработчика завершения кнопка на последнем шаге остаётся неактивной', () => {
    const { getByRole } = renderNav({ activeStepId: STEPS[STEPS.length - 1].id })
    expect(getByRole('button', { name: /Завершить/i }).disabled).toBe(true)
  })
})
