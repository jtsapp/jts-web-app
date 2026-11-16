// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMicPermission } from './useMicPermission.js'

// Решение «объяснить или открывать сразу» принимается в нажатии синхронно, поэтому хук обязан знать разрешение
// заранее и следить за его сменой: ученик разрешил в окне браузера — следующая просьба уже не нужна.
function fakeStatus(state) {
  const handlers = new Set()
  return {
    state,
    addEventListener: vi.fn((ev, fn) => ev === 'change' && handlers.add(fn)),
    removeEventListener: vi.fn((ev, fn) => handlers.delete(fn)),
    set(next) {
      this.state = next
      handlers.forEach((fn) => fn())
    },
    get listeners() {
      return handlers.size
    },
  }
}

function stubPermissions(query) {
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: query ? { query } : undefined })
}

afterEach(() => stubPermissions(null))

describe('useMicPermission', () => {
  it('отдаёт ответ браузера и следует за его сменой, уходя — отписывается', async () => {
    const st = fakeStatus('prompt')
    stubPermissions(vi.fn(async () => st))
    const { result, unmount } = renderHook(() => useMicPermission())
    expect(result.current).toBe('unknown')
    await act(async () => {})
    expect(result.current).toBe('prompt')
    act(() => st.set('granted'))
    expect(result.current).toBe('granted')
    unmount()
    expect(st.listeners).toBe(0)
  })

  it('нет Permissions API или имя «microphone» браузеру неизвестно — unknown', async () => {
    stubPermissions(null)
    const a = renderHook(() => useMicPermission())
    await act(async () => {})
    expect(a.result.current).toBe('unknown')

    stubPermissions(vi.fn(async () => Promise.reject(new TypeError('microphone'))))
    const b = renderHook(() => useMicPermission())
    await act(async () => {})
    expect(b.result.current).toBe('unknown')
  })
})
