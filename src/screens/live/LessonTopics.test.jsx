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
  // Заголовок и счётчик списка ушли во вкладку колонки (см. LessonSidePanel):
  // в макете список начинается сразу строками тем.
  it('список рисуется без собственного заголовка', () => {
    const { container } = renderTopics()
    expect(container.querySelector('.lv-topics__head')).toBeNull()
    expect(container.firstChild.className).toBe('lv-topics__list')
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

  // Где преподаватель — это показывал бегунок «Т» на треке маршрута. Маршрут
  // убран, метка переехала в список: без неё ученик не видит, что учитель ушёл
  // смотреть другую тему.
  it('метка «Т» стоит у темы, которую открыл преподаватель', () => {
    const { container } = renderTopics({ teacherStepId: 5 })
    const marks = container.querySelectorAll('.lv-topics__teacher')
    expect(marks).toHaveLength(1)
    expect(marks[0].closest('.lv-topics__item').textContent).toContain('Свободная практика')
  })

  it('позиция преподавателя неизвестна — метки нет вовсе', () => {
    const { container } = renderTopics()
    expect(container.querySelectorAll('.lv-topics__teacher')).toHaveLength(0)
  })

  it('галочка рисуется только у пройденных тем', () => {
    const { container } = renderTopics()
    expect(container.querySelectorAll('.lv-topics__marker svg')).toHaveLength(2)
  })
})
