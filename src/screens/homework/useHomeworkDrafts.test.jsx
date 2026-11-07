// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import useHomeworkDrafts from './useHomeworkDrafts.js'
import { saveHomeworkDraft } from '../../api.js'

vi.mock('../../api.js', () => ({ saveHomeworkDraft: vi.fn(async () => null) }))
const hw = (over = {}) => ({ id: 7, status: 'ASSIGNED', exercises: [{ id: 71, question: { id: 'q1' } }], ...over })

describe('черновики обычной домашки', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    saveHomeworkDraft.mockReset().mockResolvedValue(null)
  })
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

  it('сохраняет ввод на сервер без «Проверить», даже если хранилище браузера переполнено', async () => {
    vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    const { result } = renderHook(() => useHomeworkDrafts(hw(), 'TOK'))
    act(() => result.current.onAnswer('q1', 'unfinished'))
    await act(() => vi.advanceTimersByTimeAsync(600))
    expect(saveHomeworkDraft).toHaveBeenCalledWith(7, 71, 'TOK', 'unfinished')
    expect(result.current.draftStatus).toBe('saved')
    expect(result.current.answers.q1).toBe('unfinished')
  })

  it('после перезахода на другом устройстве показывает серверный черновик, а не прежний проверенный ответ', () => {
    const work = hw({ exercises: [{ id: 71, question: { id: 'q1' }, studentAnswer: 'old', draftAnswer: 'new draft' }] })
    const { result } = renderHook(() => useHomeworkDrafts(work, 'TOK'))
    expect(result.current.answers.q1).toBe('new draft')
    expect(saveHomeworkDraft).not.toHaveBeenCalled()
  })

  it('подтверждение старого запроса не удаляет ответ, дописанный во время сохранения', async () => {
    let complete
    saveHomeworkDraft.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve }))
    const { result } = renderHook(() => useHomeworkDrafts(hw(), 'TOK'))
    act(() => result.current.onAnswer('q1', 'a'))
    await act(() => vi.advanceTimersByTimeAsync(600))
    act(() => result.current.onAnswer('q1', 'ab'))
    await act(async () => { complete(null) })
    expect(saveHomeworkDraft.mock.calls.map((c) => c[3])).toEqual(['a', 'ab'])
    expect(JSON.parse(localStorage.getItem('hw-pending:7'))).toEqual({})
    expect(result.current.answers.q1).toBe('ab')
  })

  it('сбой сети оставляет черновик и повторяет сохранение после восстановления связи', async () => {
    saveHomeworkDraft.mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useHomeworkDrafts(hw(), 'TOK'))
    act(() => result.current.onAnswer('q1', 'not lost'))
    await act(() => vi.advanceTimersByTimeAsync(600))
    expect(result.current.draftStatus).toBe('error')
    expect(JSON.parse(localStorage.getItem('hw-pending:7'))['71'].answer).toBe('not lost')
    await act(async () => { window.dispatchEvent(new Event('online')) })
    expect(saveHomeworkDraft).toHaveBeenCalledTimes(2)
    expect(result.current.draftStatus).toBe('saved')
  })

  it('обновление страницы сразу после ввода отправляет черновик и восстанавливает недосланное', async () => {
    saveHomeworkDraft.mockRejectedValue(new Error('offline'))
    const first = renderHook(() => useHomeworkDrafts(hw(), 'TOK'))
    act(() => first.result.current.onAnswer('q1', 'last keystroke'))
    await act(async () => { first.unmount() })
    expect(saveHomeworkDraft).toHaveBeenCalledWith(7, 71, 'TOK', 'last keystroke')
    saveHomeworkDraft.mockResolvedValue(null)
    const next = renderHook(() => useHomeworkDrafts(hw(), 'TOK'))
    expect(next.result.current.answers.q1).toBe('last keystroke')
    await act(() => vi.advanceTimersByTimeAsync(600))
    expect(next.result.current.draftStatus).toBe('saved')
  })

  it('сданную домашку не изменяет и не возрождает старые черновики', async () => {
    localStorage.setItem('hw-pending:7', JSON.stringify({ 71: { questionId: 'q1', answer: 'old draft' } }))
    const { result } = renderHook(() => useHomeworkDrafts(hw({ status: 'SUBMITTED' }), 'TOK'))
    act(() => result.current.onAnswer('q1', 'other'))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(saveHomeworkDraft).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('hw-pending:7'))).toEqual({})
  })
})
