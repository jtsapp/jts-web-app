// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LessonRoute from './LessonRoute.jsx'

const STEPS = [
  { id: 15, order: 1, title: 'Урок каталога' },
  { id: 16, order: 2, title: 'Материал урока' },
]

function renderRoute(props = {}) {
  return render(
    <I18nProvider>
      <LessonRoute steps={STEPS} activeStepId={15} statusById={{ 15: 'current', 16: 'upcoming' }} {...props} />
    </I18nProvider>
  )
}

describe('LessonRoute — бегунки на треке', () => {
  // Спека классрума (§3): на треке два бегунка, и они расходятся — преподаватель
  // волен открыть шаг вперёд или назад, не утягивая ученика.
  it('ученик стоит там, где смотрит, даже если про преподавателя ничего не известно', () => {
    const { container } = renderRoute()
    expect(container.querySelectorAll('.lw-route__rider--student')).toHaveLength(1)
    expect(container.querySelectorAll('.lw-route__rider--teacher')).toHaveLength(0)
  })

  it('преподаватель появляется на треке, когда его шаг известен', () => {
    const { container } = renderRoute({ teacherStepId: 16 })
    const teacher = container.querySelector('.lw-route__rider--teacher')
    expect(teacher).not.toBeNull()
    // Именно на своём шаге, а не рядом с учеником.
    expect(teacher.closest('.lw-route__item')).toBe(
      container.querySelectorAll('.lw-route__item')[1]
    )
  })

  // На экране преподавателя позиция ученика приходит трансляцией. Пока её нет,
  // бегунка «У» быть не должно: иначе преподаватель видит под меткой ученика
  // самого себя и думает, что тот идёт с ним нога в ногу.
  it('позиция ученика неизвестна — бегунка «У» нет', () => {
    const { container } = renderRoute({ studentStepId: null, teacherStepId: 15 })
    expect(container.querySelectorAll('.lw-route__rider--student')).toHaveLength(0)
    expect(container.querySelectorAll('.lw-route__rider--teacher')).toHaveLength(1)
  })

  it('позиция ученика пришла — бегунок встаёт на его шаг, не на свой', () => {
    const { container } = renderRoute({ studentStepId: 16, teacherStepId: 15 })
    const student = container.querySelector('.lw-route__rider--student')
    expect(student.closest('.lw-route__item')).toBe(container.querySelectorAll('.lw-route__item')[1])
  })

  it('на одном шаге умещаются оба', () => {
    const { container } = renderRoute({ teacherStepId: 15 })
    const first = container.querySelectorAll('.lw-route__item')[0]
    expect(first.querySelectorAll('.lw-route__rider')).toHaveLength(2)
  })

  // «ШАГ 00» — тот самый дефект: нумерация шла от position из базы, а он с нуля.
  it('шаги подписаны с единицы', () => {
    const { container } = renderRoute()
    const nums = [...container.querySelectorAll('.lw-route__num')].map((n) => n.textContent.trim())
    expect(nums).toEqual(['ШАГ 01', 'ШАГ 02'])
  })
})
