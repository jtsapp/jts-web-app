// @vitest-environment jsdom
//
// План перечитывается после переноса и после «Отметить выполненным» (часть 3). Сетевая осечка такого перечитывания не
// должна стирать уже показанный план: getGePlan отвечает null и на «ручки нет», и на сбой, и раньше «Сегодня» на
// «Главной» подменялось прежней карточкой, а экран «План» — экраном ошибки.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const getGePlan = vi.fn()
vi.mock('../../api.js', () => ({ getGePlan: (...a) => getGePlan(...a) }))
vi.mock('./courseFrontier.js', () => ({ loadCourseFrontier: async () => [] }))

const { useGePlan } = await import('./useGePlan.js')

const PLAN = { today: '2026-10-14', state: 'ready', tasks: [{ id: 1, kind: 'practice', module: 'ai_tutor', date: '2026-10-14' }] }

describe('useGePlan', () => {
  beforeEach(() => getGePlan.mockReset())

  it('ручки нет с самого начала — status none', async () => {
    getGePlan.mockResolvedValue(null)
    const { result } = renderHook(() => useGePlan('TOK'))
    await waitFor(() => expect(result.current.status).toBe('none'))
  })

  it('перечитывание не удалось — остаётся прежний план', async () => {
    getGePlan.mockResolvedValueOnce(PLAN).mockResolvedValueOnce(null)
    const { result } = renderHook(() => useGePlan('TOK'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.reload())
    await waitFor(() => expect(getGePlan).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.plan).toBe(PLAN))
    expect(result.current.status).toBe('ready')
  })
})
