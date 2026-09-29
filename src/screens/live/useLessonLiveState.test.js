// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../api.js', () => ({ getLiveState: vi.fn() }))

import { getLiveState } from '../../api.js'
import { useLessonLiveState } from './useLessonLiveState.js'

/**
 * Состояние занятия приходит двумя путями — снимком при (пере)подключении и
 * рассылкой по сокету, — и ни один не обязан прийти первым. Порядок наводит
 * номер версии: применяется только то, что новее уже применённого.
 */
const NOW = 1790000000000

function liveState(version, patch = {}) {
  return {
    lessonId: 14,
    version,
    status: 'IN_PROGRESS',
    pausedUntilMs: null,
    leading: true,
    focusSeq: version,
    focusView: 'LESSON',
    sectionId: 301,
    materialId: 912,
    stepId: null,
    questionId: null,
    stageIndex: null,
    timer: null,
    serverNowMs: NOW,
    ...patch,
  }
}

/** Ответ снимка, который тест отдаёт, когда ему нужно. */
function deferred() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  getLiveState.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('useLessonLiveState', () => {
  it('до первого состояния — null, поправка часов нулевая', () => {
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK'))
    expect(result.current.state).toBeNull()
    expect(result.current.offset).toBe(0)
  })

  it('на подключении берёт снимок и применяет его', async () => {
    getLiveState.mockResolvedValue(liveState(3))
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK'))

    await act(async () => { result.current.onConnect() })

    expect(getLiveState).toHaveBeenCalledWith('TOK', 14)
    expect(result.current.state.version).toBe(3)
  })

  // Пустое занятие (строки в базе ещё нет) сервер отдаёт версией 0 — это тоже
  // состояние, а не «ничего».
  it('версия 0 — применяется', async () => {
    getLiveState.mockResolvedValue(liveState(0, { leading: false, sectionId: null, materialId: null }))
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK'))

    await act(async () => { result.current.onConnect() })

    expect(result.current.state.version).toBe(0)
  })

  it('состояние старее или равное применённому отбрасывается', () => {
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK'))

    act(() => result.current.onState(liveState(5)))
    act(() => result.current.onState(liveState(4, { stageIndex: 9 })))
    act(() => result.current.onState(liveState(5, { stageIndex: 9 })))

    expect(result.current.state.version).toBe(5)
    expect(result.current.state.stageIndex).toBeNull()

    act(() => result.current.onState(liveState(6, { stageIndex: 2 })))
    expect(result.current.state.stageIndex).toBe(2)
  })

  // Гонка при входе: снимок ушёл, сокет успел принести более свежее изменение,
  // потом ответил снимок. Применить его — откатить класс назад.
  it('снимок старее уже пришедшего по сокету — отброшен', async () => {
    const snapshot = deferred()
    getLiveState.mockReturnValue(snapshot.promise)
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK'))

    act(() => { result.current.onConnect() })
    act(() => result.current.onState(liveState(8, { stageIndex: 4 })))
    await act(async () => { snapshot.resolve(liveState(7, { stageIndex: 1 })) })

    expect(result.current.state.version).toBe(8)
    expect(result.current.state.stageIndex).toBe(4)
  })

  // За время обрыва класс мог уйти: снимок берётся на каждом переподключении.
  it('повторяет снимок при каждом переподключении', async () => {
    getLiveState.mockResolvedValueOnce(liveState(3)).mockResolvedValueOnce(liveState(9, { sectionId: 302 }))
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK'))

    await act(async () => { result.current.onConnect() })
    await act(async () => { result.current.onConnect() })

    expect(getLiveState).toHaveBeenCalledTimes(2)
    expect(result.current.state.sectionId).toBe(302)
  })

  // Время сервера сверяется при каждом получении: часы ученика могут отставать
  // на минуты, а таймер и конец паузы считаются по времени сервера.
  it('offset = serverNowMs − Date.now() в момент получения', () => {
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK'))

    act(() => result.current.onState(liveState(1, { serverNowMs: NOW + 4_000 })))
    expect(result.current.offset).toBe(4_000)

    vi.setSystemTime(NOW + 10_000)
    act(() => result.current.onState(liveState(2, { serverNowMs: NOW + 9_000 })))
    expect(result.current.offset).toBe(-1_000)
  })

  // Отброшенное состояние отбрасывается целиком — и его часы тоже.
  it('отброшенное состояние поправку часов не трогает', () => {
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK'))

    act(() => result.current.onState(liveState(2, { serverNowMs: NOW + 4_000 })))
    act(() => result.current.onState(liveState(1, { serverNowMs: NOW + 60_000 })))

    expect(result.current.offset).toBe(4_000)
  })

  // Странице нужны переходы, а не только итог: «ведение снято» — это пара
  // prev→next. Батч React схлопнул бы два состояния в одно, поэтому переход
  // отдаётся колбэком на каждое применённое состояние.
  it('onApply получает каждый переход prev → next и поправку часов', () => {
    const onApply = vi.fn()
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK', { onApply }))
    const first = liveState(1, { serverNowMs: NOW + 2_000 })
    const second = liveState(2, { leading: false })

    act(() => {
      result.current.onState(first)
      result.current.onState(second)
      result.current.onState(liveState(2))
    })

    expect(onApply.mock.calls).toEqual([
      [first, null, 2_000],
      [second, first, 0],
    ])
  })

  // Снимок — точка синхронизации: после него страница решает, догонять ли
  // класс. Даже если нового в нём нет (переподключение без изменений).
  it('onSnapshot после каждого снимка — с текущим состоянием, даже если снимок не новее', async () => {
    const onSnapshot = vi.fn()
    getLiveState.mockResolvedValue(liveState(4))
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK', { onSnapshot }))

    await act(async () => { result.current.onConnect() })
    await act(async () => { result.current.onConnect() })

    expect(onSnapshot).toHaveBeenCalledTimes(2)
    expect(onSnapshot.mock.calls[1][0].version).toBe(4)
  })

  // Старый бэкенд (канала ещё нет) отвечает ошибкой — экран живёт как раньше,
  // без состояния, а не падает.
  it('ошибка снимка оставляет состояние пустым', async () => {
    getLiveState.mockRejectedValue(new Error('Ошибка сервера (404)'))
    const onSnapshot = vi.fn()
    const { result } = renderHook(() => useLessonLiveState(14, 'TOK', { onSnapshot }))

    await act(async () => { result.current.onConnect() })

    expect(result.current.state).toBeNull()
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  // Экран урока не пересоздаётся при смене занятия (App.jsx отдаёт новый
  // lessonId тому же компоненту): чужое состояние и чужой снимок не применяются.
  it('при смене занятия прежнее состояние и запоздавший снимок не применяются', async () => {
    const late = deferred()
    getLiveState.mockReturnValueOnce(late.promise)
    const onApply = vi.fn()
    const { result, rerender } = renderHook(({ id }) => useLessonLiveState(id, 'TOK', { onApply }), {
      initialProps: { id: 14 },
    })
    act(() => result.current.onState(liveState(5)))
    act(() => { result.current.onConnect() })
    onApply.mockClear()

    rerender({ id: 15 })
    expect(result.current.state).toBeNull()

    await act(async () => { late.resolve(liveState(6)) })
    expect(result.current.state).toBeNull()
    expect(onApply).not.toHaveBeenCalled()

    act(() => result.current.onState(liveState(1, { lessonId: 15 })))
    expect(result.current.state.version).toBe(1)
  })
})
