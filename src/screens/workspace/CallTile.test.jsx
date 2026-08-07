// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import CallTile from './CallTile.jsx'

// Спека §5.1 описывает у плитки звонка два состояния, и второе легко остаётся
// мёртвым кодом: по умолчанию урок считается идущим, так что свёрнутый вид не
// показывается ни на одном экране до тех пор, пока бэкенд не начнёт отдавать
// состояние звонка. Тест держит его живым.
function renderTile(props) {
  return render(
    <I18nProvider>
      <CallTile teacherName="Дана" {...props} />
    </I18nProvider>
  )
}

describe('CallTile', () => {
  it('по умолчанию показывает активный звонок: превью и управление', () => {
    const { container } = renderTile()
    expect(container.querySelector('.lw-call__preview')).toBeTruthy()
    expect(screen.getByText('Дана')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /позвонить/i })).toBeNull()
  })

  it('без связи показывает одну кнопку «Позвонить учителю»', () => {
    const { container } = renderTile({ connected: false })
    expect(container.querySelector('.lw-call__preview')).toBeNull()
    expect(screen.getByRole('button', { name: /позвонить учителю/i })).toBeTruthy()
  })

  it('сообщает о нажатии на «Позвонить»', () => {
    const onCall = vi.fn()
    renderTile({ connected: false, onCall })
    screen.getByRole('button', { name: /позвонить учителю/i }).click()
    expect(onCall).toHaveBeenCalledTimes(1)
  })

  // Кнопки звонка нефункциональны в №1, но остаются подписанными: иначе
  // скринридер читает три безымянные кнопки подряд.
  it('кнопки управления подписаны, даже будучи неактивными', () => {
    renderTile()
    for (const name of [/микрофон/i, /камера/i, /покинуть звонок/i]) {
      const button = screen.getByRole('button', { name })
      expect(button.disabled).toBe(true)
    }
  })
})
