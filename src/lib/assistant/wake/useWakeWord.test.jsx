// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// «Ухо» подменено: здесь проверяется, КОГДА хук слушает и отдаёт микрофон.
const ears = []
vi.mock('./wakeEar.js', () => ({
  createWakeEar: (opts) => {
    const ear = {
      opts,
      state: 'idle',
      start: vi.fn(async () => {
        ear.state = 'listening'
        opts.onState('listening')
      }),
      stop: vi.fn(() => {
        if (ear.state === 'error' || ear.state === 'idle') return
        ear.state = 'idle'
        opts.onState('idle')
      }),
      prepare: vi.fn(async () => {
        ear.state = 'idle'
        opts.onState('idle')
      }),
      resume: vi.fn(),
      dispose: vi.fn(),
      fail(err) {
        ear.state = 'error'
        opts.onState('error', err)
      },
    }
    ears.push(ear)
    return ear
  },
}))
vi.mock('../../speech.js', () => ({ isTtsActive: vi.fn(() => false), unlockSpeech: vi.fn() }))

const { useWakeWord, WAKE_COOLDOWN_MS } = await import('./useWakeWord.js')
const { readWakeOn, writeWakeOn } = await import('./wakeSetting.js')
const { isTtsActive } = await import('../../speech.js')

beforeEach(() => {
  vi.useFakeTimers()
  ears.length = 0
  globalThis.AudioContext = class {}
  // Дорожка — одна на вызов: арбитр запоминает её, а тест потом её же «гасит».
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => {
        const track = { readyState: 'live' }
        return { getAudioTracks: () => [track] }
      }),
    },
  })
  writeWakeOn(true)
  isTtsActive.mockReturnValue(false)
})
afterEach(() => {
  writeWakeOn(false)
  vi.useRealTimers()
})

const props = (extra = {}) => ({ token: 't', enabled: true, open: false, onWake: vi.fn(), ...extra })
const mount = (extra) => renderHook((p) => useWakeWord(p), { initialProps: props(extra) })
const wait = (ms = 500) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

describe('useWakeWord', () => {
  it('окно закрыто — слушает; открыли — отдаёт микрофон', async () => {
    const { result, rerender } = mount()
    await wait()
    expect(ears[0].start).toHaveBeenCalled()
    expect(result.current.state).toBe('listening')
    rerender(props({ open: true }))
    await wait()
    expect(ears[0].stop).toHaveBeenCalled()
    expect(result.current.state).toBe('paused')
  })

  it('раздел взял микрофон — «ухо» отдаёт его сразу и ждёт, пока раздел закончит', async () => {
    const { result } = mount()
    await wait()
    let stream
    await act(async () => {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    })
    expect(ears[0].stop).toHaveBeenCalled()
    await wait()
    expect(result.current.state).toBe('paused')
    stream.getAudioTracks()[0].readyState = 'ended'
    await wait(1500)
    expect(result.current.state).toBe('listening')
  })

  it('звучит речь (Луна, «послушать») — не слушает', async () => {
    isTtsActive.mockReturnValue(true)
    const { result } = mount()
    await wait()
    expect(ears[0].start).not.toHaveBeenCalled()
    expect(result.current.state).toBe('paused')
  })

  it('позывной: onWake, «ухо» молчит 5 с, потом снова слушает', async () => {
    const onWake = vi.fn()
    mount({ onWake })
    await wait()
    act(() => ears[0].opts.onWake())
    expect(onWake).toHaveBeenCalledTimes(1)
    expect(ears[0].stop).toHaveBeenCalled()
    ears[0].start.mockClear()
    await wait(WAKE_COOLDOWN_MS - 600)
    expect(ears[0].start).not.toHaveBeenCalled()
    await wait(1000)
    expect(ears[0].start).toHaveBeenCalled()
  })

  // Быстрая команда («Луна, дальше»): следующую ученик скажет скоро — окно сокращает глухоту.
  it('позывной с командой: итог уходит окну, окно может сократить глухоту', async () => {
    const onWake = vi.fn(() => ({ cooldownMs: 0 }))
    mount({ onWake })
    await wait()
    const detail = { text: 'луна дальше', words: [], preroll: () => null }
    act(() => ears[0].opts.onWake(detail))
    expect(onWake).toHaveBeenCalledWith(detail)
    ears[0].start.mockClear()
    await wait(1000)
    expect(ears[0].start).toHaveBeenCalled()
  })

  it('отказ в микрофоне — позывной выключается, причина остаётся', async () => {
    const { result } = mount()
    await wait()
    act(() => ears[0].fail('denied'))
    expect(readWakeOn()).toBe(false)
    expect(result.current.state).toBe('off')
    expect(result.current.error).toBe('denied')
  })

  it('enable — в жесте: будит контекст и готовит модель с разрешением', () => {
    writeWakeOn(false)
    const { result } = mount({ open: true })
    act(() => result.current.enable())
    expect(readWakeOn()).toBe(true)
    expect(ears[0].resume).toHaveBeenCalled()
    expect(ears[0].prepare).toHaveBeenCalled()
  })

  it('без входа или на экране без Луны — выключен и ничего не создаёт', async () => {
    const { result } = mount({ token: null })
    await wait()
    expect(ears).toHaveLength(0)
    expect(result.current.state).toBe('off')
  })
})
