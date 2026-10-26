// @vitest-environment jsdom
// «+N токенов» у задачи дня на «Главной» студента (ТЗ кабинетов, раздел 5).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import GeTaskRow from './GeTaskRow.jsx'

const task = (over = {}) => ({ id: 1, kind: 'live', date: '2026-10-27', status: 'open', extra: { scheduledAt: '2026-10-27T19:00:00' }, ...over })

const wrap = (node) => render(<I18nProvider><ul>{node}</ul></I18nProvider>)

describe('GeTaskRow — токены у задачи', () => {
  it('показывает «+2 токена» у невыполненной задачи', () => {
    wrap(<GeTaskRow task={task()} title="Урок" tokens={2} />)
    expect(screen.getByTestId('task-tokens').textContent).toBe('+2 токена')
  })

  it('без токенов и у выполненной задачи метки нет', () => {
    const { unmount } = wrap(<GeTaskRow task={task()} title="Урок" tokens={0} />)
    expect(screen.queryByTestId('task-tokens')).toBeNull()
    unmount()
    wrap(<GeTaskRow task={task({ status: 'completed' })} title="Урок" tokens={2} />)
    expect(screen.queryByTestId('task-tokens')).toBeNull()
  })
})
