// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { getIeltsMe, getSatMeCached } from '../api.js'
import { useStudentExams } from './useStudentExams.js'

vi.mock('../api.js', () => ({ getIeltsMe: vi.fn(), getSatMeCached: vi.fn() }))
beforeEach(() => {
  getIeltsMe.mockReset().mockResolvedValue({ purchased: true })
  getSatMeCached.mockReset().mockResolvedValue({ purchased: true })
})

describe('экзамены при обновлении тарифа', () => {
  it('не запрашивает экзамены до успешной проверки матрицы', () => {
    const { result } = renderHook(() => useStudentExams('one', { status: 'error' }))
    expect(result.current.ready).toBe(false)
    expect(getIeltsMe).not.toHaveBeenCalled()
    expect(getSatMeCached).not.toHaveBeenCalled()
  })

  it('новый снимок настроек перепроверяет и отзывает прежний доступ к экзамену', async () => {
    const { result, rerender } = renderHook(({ sections }) => useStudentExams('two', sections), { initialProps: { sections: { status: 'ready' } } })
    await waitFor(() => expect(result.current.sat).toBe(true))
    getSatMeCached.mockResolvedValue({ purchased: false })
    getIeltsMe.mockResolvedValue({ purchased: false })
    rerender({ sections: { status: 'ready' } })
    await waitFor(() => expect(result.current.sat).toBe(false))
    expect(result.current.ielts).toBe(false)
    expect(getIeltsMe).toHaveBeenCalledTimes(2)
  })

  it('результат запроса прошлого ученика не открывает экзамены новому', async () => {
    let oldResponse
    getIeltsMe.mockReturnValueOnce(new Promise((resolve) => { oldResponse = resolve }))
      .mockResolvedValueOnce({ purchased: false })
    getSatMeCached.mockResolvedValue({ purchased: false })
    const sections = { status: 'ready' }
    const { result, rerender } = renderHook(({ token }) => useStudentExams(token, sections), { initialProps: { token: 'old' } })
    await act(async () => {})
    rerender({ token: 'new' })
    expect(result.current.ready).toBe(false)
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => { oldResponse({ purchased: true }) })
    expect(result.current.ielts).toBe(false)
  })
})
