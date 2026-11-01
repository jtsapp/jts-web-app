// @vitest-environment jsdom
//
// Описание mock Writing по типу: старт отдаёт выбранное задание и тип; типа без заданий — пустое состояние, а не
// пустой редактор (замечание владельца 10).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import WritingMockView from './WritingMockView.jsx'

const catalog = (items) => ({ status: 'ready', items, reload: () => {} })
const renderView = (props) =>
  render(<I18nProvider><WritingMockView track="academic" drafts={[]} onStart={() => {}} onBack={() => {}} onSkill={() => {}} {...props} /></I18nProvider>)

describe('WritingMockView', () => {
  it('старт — ещё не написанное задание типа, тип в заголовке, условия экзамена', () => {
    const onStart = vi.fn()
    const items = [
      { id: 'W2-001', kind: 'task2', category: 'opinion', module: 'both', attemptCount: 1, lastAttempt: { finishedAt: '2026-10-01T10:00:00' } },
      { id: 'W2-002', kind: 'task2', category: 'opinion', module: 'both', attemptCount: 0 },
      { id: 'W2-003', kind: 'task2', category: 'discussion', module: 'both', attemptCount: 0 },
    ]
    renderView({ listKey: 'task2:opinion', catalog: catalog(items), onStart })
    expect(screen.getByRole('heading', { level: 1, name: 'Mock · Task 2 · Opinion essay' })).toBeTruthy()
    expect(screen.getByText('40 мин')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Начать mock/ }))
    expect(onStart).toHaveBeenCalledWith('W2-002', 'task2', 'task2:opinion')
  })

  it('тип без заданий и чужой тип трека — пустое состояние без кнопки старта', () => {
    const onSkill = vi.fn()
    const items = [{ id: 'W1-AC-001', kind: 'task1', category: 'line', module: 'academic', attemptCount: 0 }]
    const { unmount } = renderView({ listKey: 'task1:map', catalog: catalog(items), onSkill })
    expect(screen.getByText('Заданий этого типа пока нет')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Начать mock/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Другие типы' }))
    expect(onSkill).toHaveBeenCalled()
    unmount()
    renderView({ listKey: 'task1:formal', catalog: catalog(items) })
    expect(screen.getByText('Заданий этого типа пока нет')).toBeTruthy()
  })
})
