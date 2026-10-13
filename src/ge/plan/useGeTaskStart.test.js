// @vitest-environment jsdom
//
// Кнопка задачи плана: переход по taskAction или отметка своего задания преподавателя. Сбой отметки виден: без него
// ученик жал бы кнопку снова и снова, думая, что она не работает (истёкший вход, старый бэкенд без ручки).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const markGeTaskDone = vi.fn()
vi.mock('../../api.js', () => ({ markGeTaskDone: (...a) => markGeTaskDone(...a) }))

const { useGeTaskStart } = await import('./useGeTaskStart.js')

const custom = { id: 5, kind: 'custom', origin: 'teacher', status: 'available', extra: { title: 'Сериал' } }

describe('useGeTaskStart', () => {
  beforeEach(() => markGeTaskDone.mockReset())

  it('переход — в onNav, отметка — в api и перечитывание плана', async () => {
    const onNav = vi.fn()
    const reload = vi.fn()
    markGeTaskDone.mockResolvedValue({})
    const { result } = renderHook(() => useGeTaskStart({ token: 'TOK', level: 'A2', onNav, reload }))

    act(() => result.current.start({ kind: 'practice', module: 'ai_tutor', status: 'available' }))
    expect(onNav).toHaveBeenCalledWith('tutor')

    act(() => result.current.start(custom))
    expect(markGeTaskDone).toHaveBeenCalledWith('TOK', 5, true)
    await waitFor(() => expect(reload).toHaveBeenCalled())
    expect(result.current.markFailed).toBe(false)
  })

  it('отметка не прошла — markFailed, и следующая попытка его снимает', async () => {
    markGeTaskDone.mockRejectedValueOnce(new Error('401')).mockResolvedValueOnce({})
    const { result } = renderHook(() => useGeTaskStart({ token: 'TOK', level: 'A2', onNav: vi.fn(), reload: vi.fn() }))
    act(() => result.current.start(custom))
    await waitFor(() => expect(result.current.markFailed).toBe(true))
    act(() => result.current.start(custom))
    expect(result.current.markFailed).toBe(false)
  })
})
