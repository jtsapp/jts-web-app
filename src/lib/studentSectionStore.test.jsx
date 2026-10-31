// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { getMySections } from '../api.js'
import { useStudentSections, refreshStudentSections, STUDENT_SECTIONS_POLL_MS, STUDENT_SECTIONS_TIMEOUT_MS } from './studentSectionStore.js'

vi.mock('../api.js', () => ({ getMySections: vi.fn() }))
const token = (id, version = 1) => `e30.${btoa(JSON.stringify({ userId: id, version }))}.sig`
const access = (allowed = ['lessons'], tariff = 'GENERAL') => ({ known: true, tariff, format: 'INDIVIDUAL', allowed })
const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve() })

beforeEach(() => { vi.useFakeTimers(); getMySections.mockReset(); getMySections.mockResolvedValue(access()) })
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('единое состояние разделов ученика', () => {
  it('три потребителя делят один запрос; открытое меню замечает новый тариф при опросе', async () => {
    const t = token(101)
    const { result } = renderHook(() => [useStudentSections(t), useStudentSections(t), useStudentSections(t, 'home')])
    expect(result.current[0].status).toBe('loading')
    await settle()
    expect(getMySections).toHaveBeenCalledTimes(1)
    expect(result.current[0]).toBe(result.current[1])
    expect(result.current[0]).toBe(result.current[2])
    getMySections.mockResolvedValue(access(['sat'], 'SAT'))
    await act(async () => { await vi.advanceTimersByTimeAsync(STUDENT_SECTIONS_POLL_MS) })
    expect(getMySections).toHaveBeenCalledTimes(2)
    expect(result.current[0].allowed).toEqual(['sat'])
    expect(result.current[2].tariff).toBe('SAT')
  })

  it('переход между экранами запрашивает свежие настройки без перезагрузки', async () => {
    const t = token(102)
    const { result, rerender } = renderHook(({ page }) => useStudentSections(t, page), { initialProps: { page: 'home' } })
    await settle()
    getMySections.mockResolvedValue(access(['practice']))
    rerender({ page: 'lessons' })
    await settle()
    expect(getMySections).toHaveBeenCalledTimes(2)
    expect(result.current.allowed).toEqual(['practice'])
  })

  it('ошибка удаляет прежние разрешения; повторная попытка восстанавливает их', async () => {
    const t = token(103)
    const { result } = renderHook(() => useStudentSections(t))
    await settle()
    getMySections.mockRejectedValue(new Error('offline'))
    await act(async () => { await refreshStudentSections(t) })
    expect(result.current).toMatchObject({ status: 'error', allowed: [] })
    getMySections.mockResolvedValue(access(['homework']))
    await act(async () => { await refreshStudentSections(t) })
    expect(result.current).toMatchObject({ status: 'ready', allowed: ['homework'] })
  })

  it.each([null, {}, { known: true }, { known: false }, { known: true, allowed: [false] }])('не принимает неполный ответ %j', async (value) => {
    getMySections.mockResolvedValue(value)
    const { result } = renderHook(() => useStudentSections(token(104)))
    await settle()
    expect(result.current).toMatchObject({ status: 'error', allowed: [] })
  })

  it('зависший запрос завершается ошибкой, отменяется и допускает повтор', async () => {
    getMySections.mockReturnValue(new Promise(() => {}))
    const t = token(105)
    const { result } = renderHook(() => useStudentSections(t))
    await settle()
    const signal = getMySections.mock.calls[0][1].signal
    await act(async () => { await vi.advanceTimersByTimeAsync(STUDENT_SECTIONS_TIMEOUT_MS) })
    expect(result.current.status).toBe('error')
    expect(signal.aborted).toBe(true)
    getMySections.mockResolvedValue(access())
    await act(async () => { await refreshStudentSections(t) })
    expect(result.current.status).toBe('ready')
  })

  it('в скрытом окне не опрашивает, при возврате и восстановлении сети перепроверяет', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    renderHook(() => useStudentSections(token(106)))
    await settle()
    visibility.mockReturnValue('hidden')
    await act(async () => { await vi.advanceTimersByTimeAsync(STUDENT_SECTIONS_POLL_MS * 2) })
    expect(getMySections).toHaveBeenCalledTimes(1)
    visibility.mockReturnValue('visible')
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(getMySections).toHaveBeenCalledTimes(2)
    await act(async () => { window.dispatchEvent(new Event('online')) })
    expect(getMySections).toHaveBeenCalledTimes(3)
  })

  it('JWT того же ученика не скрывает открытый урок; другой ученик не получает старые права', async () => {
    const { result, rerender } = renderHook(({ t }) => useStudentSections(t), { initialProps: { t: token(107, 1) } })
    await settle()
    let resolve
    getMySections.mockReturnValueOnce(new Promise((done) => { resolve = done }))
      .mockReturnValueOnce(new Promise(() => {}))
    rerender({ t: token(107, 2) })
    expect(result.current.status).toBe('ready')
    await settle()
    rerender({ t: token(108) })
    expect(result.current.status).toBe('loading')
    await act(async () => { resolve(access(['sat'])) })
    expect(result.current.status).not.toBe('ready')
  })

  it('после выхода последнего потребителя опрос и обработчики останавливаются', async () => {
    const { unmount } = renderHook(() => useStudentSections(token(109)))
    await settle()
    unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(STUDENT_SECTIONS_POLL_MS * 2); window.dispatchEvent(new Event('focus')) })
    expect(getMySections).toHaveBeenCalledTimes(1)
  })
})
