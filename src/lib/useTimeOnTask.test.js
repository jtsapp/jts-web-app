// @vitest-environment jsdom
//
// Счётчик активного времени: считать только живое время (вкладка видна,
// студент действует) и не терять последнюю пачку при уходе с экрана.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  createActivityClock,
  useTimeOnTask,
  IDLE_AFTER_MS,
  TICK_MS,
  FLUSH_EVERY_SEC,
} from './useTimeOnTask.js'

// Подставные часы: время двигаем руками, без таймеров.
function fakeNow(start = 0) {
  let t = start
  const now = () => t
  now.advance = (ms) => {
    t += ms
  }
  return now
}

describe('createActivityClock', () => {
  it('считает время, пока студент действует', () => {
    const now = fakeNow()
    const clock = createActivityClock({ now })
    for (let i = 0; i < 6; i += 1) {
      now.advance(10_000)
      clock.input()
      clock.tick()
    }
    expect(clock.take()).toBe(60)
  })

  it('после простоя считает только отрезок до ухода в бездействие', () => {
    const now = fakeNow()
    const clock = createActivityClock({ now })
    // Пять минут без единого действия: засчитываются первые две.
    for (let i = 0; i < 60; i += 1) {
      now.advance(TICK_MS)
      clock.tick()
    }
    expect(clock.take()).toBe(IDLE_AFTER_MS / 1000)
  })

  it('возврат после простоя не засчитывает простой задним числом', () => {
    const now = fakeNow()
    const clock = createActivityClock({ now })
    now.advance(IDLE_AFTER_MS)
    clock.tick()
    clock.take() // две минуты законного времени забрали
    now.advance(10 * 60_000) // десять минут простоя
    clock.input() // вернулся
    now.advance(5_000)
    clock.tick()
    expect(clock.take()).toBe(5)
  })

  it('скрытая вкладка не считается', () => {
    const now = fakeNow()
    const clock = createActivityClock({ now })
    now.advance(20_000)
    clock.setVisible(false) // досчитывает видимые 20 секунд
    now.advance(10 * 60_000)
    clock.tick()
    expect(clock.take()).toBe(20)
    clock.setVisible(true)
    now.advance(15_000)
    clock.tick()
    expect(clock.take()).toBe(15)
  })

  it('дробный хвост не теряется между пачками', () => {
    const now = fakeNow()
    const clock = createActivityClock({ now })
    now.advance(1_500)
    clock.tick()
    expect(clock.take()).toBe(1)
    now.advance(500)
    clock.tick()
    expect(clock.take()).toBe(1)
  })
})

describe('useTimeOnTask', () => {
  let fetchMock

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-09-11T08:00:00Z') })
    fetchMock = vi.fn(() => Promise.resolve({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem('jts_access_token', 'STORED')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  const sent = () =>
    fetchMock.mock.calls.map(([url, init]) => ({
      url,
      auth: init.headers.Authorization,
      keepalive: !!init.keepalive,
      ...JSON.parse(init.body),
    }))

  function keepActive(ms) {
    // Действие каждые 30 секунд — с запасом внутри порога бездействия.
    for (let t = 0; t < ms; t += 30_000) {
      window.dispatchEvent(new Event('pointerdown'))
      vi.advanceTimersByTime(Math.min(30_000, ms - t))
    }
  }

  it('шлёт пачку раз в минуту активной работы', () => {
    renderHook(() => useTimeOnTask('workbooks', { token: 'TOK' }))
    keepActive(FLUSH_EVERY_SEC * 1000)
    expect(sent()).toEqual([
      { url: '/api/profile/activity', auth: 'Bearer TOK', keepalive: false, module: 'workbooks', seconds: 60 },
    ])
  })

  it('досылает остаток при размонтировании — с keepalive', () => {
    const { unmount } = renderHook(() => useTimeOnTask('vocabulary_sr', { token: 'TOK' }))
    keepActive(25_000)
    expect(fetchMock).not.toHaveBeenCalled()
    unmount()
    expect(sent()).toEqual([
      { url: '/api/profile/activity', auth: 'Bearer TOK', keepalive: true, module: 'vocabulary_sr', seconds: 25 },
    ])
  })

  it('уход на другую вкладку досылает пачку сразу', () => {
    let state = 'visible'
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
    renderHook(() => useTimeOnTask('workbooks', { token: 'TOK' }))
    keepActive(20_000)
    state = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sent()).toMatchObject([{ keepalive: true, seconds: 20 }])
    // Пока вкладка в фоне, ничего не копится.
    vi.advanceTimersByTime(10 * 60_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    delete document.visibilityState
  })

  it('без токена в пропсах берёт сохранённый', () => {
    const { unmount } = renderHook(() => useTimeOnTask('workbooks', {}))
    keepActive(10_000)
    unmount()
    expect(sent()[0].auth).toBe('Bearer STORED')
  })

  it('аноним ничего не шлёт', () => {
    localStorage.clear()
    const { unmount } = renderHook(() => useTimeOnTask('workbooks', {}))
    keepActive(90_000)
    unmount()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('выключенный счётчик ничего не считает', () => {
    const { unmount } = renderHook(() => useTimeOnTask('workbooks', { token: 'TOK', enabled: false }))
    keepActive(90_000)
    unmount()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
