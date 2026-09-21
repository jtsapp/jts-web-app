// @vitest-environment jsdom
// Падение плеера не должно ронять всё приложение в белый экран.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LessonErrorBoundary from './LessonErrorBoundary.jsx'

function Boom() {
  throw new Error('Objects are not valid as a React child')
}

describe('LessonErrorBoundary', () => {
  it('падение урока — экран «обновите страницу» с выходом', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onExit = vi.fn()
    render(
      <I18nProvider>
        <LessonErrorBoundary onExit={onExit}>
          <Boom />
        </LessonErrorBoundary>
      </I18nProvider>,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Выйти из урока' }))
    expect(onExit).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Обновить страницу' })).toBeTruthy()
    err.mockRestore()
  })

  it('без ошибки — рендерит урок как есть', () => {
    render(
      <I18nProvider>
        <LessonErrorBoundary>
          <p>урок</p>
        </LessonErrorBoundary>
      </I18nProvider>,
    )
    expect(screen.getByText('урок')).toBeTruthy()
  })
})
