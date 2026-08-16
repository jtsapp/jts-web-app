// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LessonExitConfirm from './LessonExitConfirm.jsx'
import LessonResultCard from './LessonResultCard.jsx'

describe('оверлеи урока', () => {
  it('диалог выхода показывает текст, а не ключи', () => {
    const onStay = vi.fn(); const onLeave = vi.fn()
    const { container, getByText } = render(
      <I18nProvider><LessonExitConfirm onStay={onStay} onLeave={onLeave} /></I18nProvider>,
    )
    expect(container.textContent).not.toContain('lesson.exit')
    fireEvent.click(getByText('Выйти'))
    expect(onLeave).toHaveBeenCalled()
    fireEvent.click(getByText('Продолжить урок'))
    expect(onStay).toHaveBeenCalled()
  })

  it('карточка итогов показывает процент и счётчики', () => {
    const { container } = render(
      <I18nProvider><LessonResultCard accuracy={67} correct={2} wrong={1} subtitle="Готово" /></I18nProvider>,
    )
    expect(container.querySelector('.le-pct').textContent).toBe('67%')
    expect(container.textContent).toContain('Хорошая работа')
    expect(container.textContent).toContain('Верных ответов')
  })
})
