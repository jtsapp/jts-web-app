// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StudentSectionGate from './StudentSectionGate.jsx'

vi.mock('../screens/SectionClosedPage.jsx', () => ({
  default: ({ status, onRetry }) => <button onClick={onRetry}>{status}</button>,
}))

const access = { known: true, allowed: ['lessons', 'ielts', 'sat'] }
const exams = { ready: true, ielts: true, sat: true }

describe('защита экрана раздела', () => {
  it.each(['loading', 'error'])('%s не вызывает загрузчик экрана и его запросы', (status) => {
    const loadScreen = vi.fn(() => <div>content</div>)
    render(<StudentSectionGate required active="lessons" access={{ status }} render={loadScreen} />)
    expect(screen.getByText(status)).toBeTruthy()
    expect(loadScreen).not.toHaveBeenCalled()
  })

  it.each(['ielts', 'ielts-writing-run', 'sat', 'sat-mock'])('прямая ссылка %s требует разрешения матрицы даже с оплаченным экзаменом', (active) => {
    const loadScreen = vi.fn()
    render(<StudentSectionGate required active={active} access={{ known: true, allowed: [] }} exams={exams} render={loadScreen} />)
    expect(screen.getByText('closed')).toBeTruthy()
    expect(loadScreen).not.toHaveBeenCalled()
  })

  it('ждёт доступа экзамена и открывает экран только после обеих проверок', () => {
    const loadScreen = vi.fn(() => <div>exam content</div>)
    const props = { required: true, active: 'sat-study', access, render: loadScreen }
    const { rerender } = render(<StudentSectionGate {...props} exams={{ ready: false }} />)
    expect(loadScreen).not.toHaveBeenCalled()
    rerender(<StudentSectionGate {...props} exams={{ ready: true, sat: false }} />)
    expect(loadScreen).not.toHaveBeenCalled()
    rerender(<StudentSectionGate {...props} exams={exams} />)
    expect(screen.getByText('exam content')).toBeTruthy()
    expect(loadScreen).toHaveBeenCalledTimes(1)
  })

  it('после ошибки повтор проверяет настройки; закрытие тарифа убирает уже открытый экран', () => {
    const onRetry = vi.fn()
    const props = { required: true, active: 'lessons', render: () => <div>lesson content</div>, onRetry }
    const { rerender } = render(<StudentSectionGate {...props} access={{ status: 'error' }} />)
    fireEvent.click(screen.getByText('error'))
    expect(onRetry).toHaveBeenCalledTimes(1)
    rerender(<StudentSectionGate {...props} access={access} />)
    expect(screen.getByText('lesson content')).toBeTruthy()
    rerender(<StudentSectionGate {...props} access={{ known: true, allowed: [] }} />)
    expect(screen.queryByText('lesson content')).toBeNull()
    expect(screen.getByText('closed')).toBeTruthy()
  })

  it('общие страницы и кабинет преподавателя доступны независимо от ученической матрицы', () => {
    const props = { render: () => <div>content</div>, access: { status: 'error' } }
    const { rerender } = render(<StudentSectionGate {...props} required active="contracts" />)
    expect(screen.getByText('content')).toBeTruthy()
    rerender(<StudentSectionGate {...props} required={false} active="lessons" />)
    expect(screen.getByText('content')).toBeTruthy()
  })
})
