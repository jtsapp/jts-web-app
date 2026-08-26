// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LessonTopics from './LessonTopics.jsx'

const STEPS = [
  { id: 1, order: 1, title: 'Разминка: small talk' },
  { id: 2, order: 2, title: 'Правило: Present Perfect' },
  { id: 3, order: 3, title: 'Практика: just / yet / already' },
  { id: 4, order: 4, title: 'Выбор правильного варианта' },
  { id: 5, order: 5, title: 'Свободная практика' },
]

const STATUS = { 1: 'done', 2: 'done', 3: 'current', 4: 'locked', 5: 'locked' }

function renderTopics(props = {}) {
  return render(
    <I18nProvider>
      <LessonTopics steps={STEPS} activeStepId={3} statusById={STATUS} {...props} />
    </I18nProvider>
  )
}

describe('LessonTopics — единый список тем живого урока', () => {
  // Макет «Онлайн-уроки»: счётчик показывает место активной темы, а не число
  // пройденных — «2 из 5» стоит рядом с третьей строкой только тогда, когда
  // ученик действительно на ней.
  it('счётчик считает по месту активной темы', () => {
    renderTopics()
    expect(screen.getByText('3 из 5')).toBeTruthy()
  })

  it('активной темы нет в списке — счётчик показывает ноль, а не первую тему', () => {
    renderTopics({ activeStepId: 99 })
    expect(screen.getByText('0 из 5')).toBeTruthy()
  })

  it('три состояния строки: пройдено, текущая, впереди', () => {
    const { container } = renderTopics()
    expect(container.querySelectorAll('.lv-topics__item.is-done')).toHaveLength(2)
    expect(container.querySelectorAll('.lv-topics__item.is-active')).toHaveLength(1)
    expect(container.querySelectorAll('.lv-topics__item.is-locked')).toHaveLength(2)
  })

  // Список заменил собой «Маршрут урока», поэтому переход по клику обязан
  // работать на любой теме, включая ещё не пройденную.
  it('клик по теме — переход, в том числе на тему впереди', () => {
    const onSelect = vi.fn()
    renderTopics({ onSelect })
    fireEvent.click(screen.getByText('Свободная практика'))
    expect(onSelect).toHaveBeenCalledWith(5)
  })

  it('галочка рисуется только у пройденных тем', () => {
    const { container } = renderTopics()
    expect(container.querySelectorAll('.lv-topics__marker svg')).toHaveLength(2)
  })
})
