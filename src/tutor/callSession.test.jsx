// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { useCallSession, PING_INTERVAL_MS } from './callSession.js'

// Ловим все запросы к /api/livekit/session и разбираем, что именно ушло.
let sent
function events() {
  return sent.map((b) => b.event)
}

function Stage({ room, tutorPresent, onReady }) {
  const close = useCallSession(room, tutorPresent)
  onReady(close)
  return null
}

let closeFn = () => {}
const mount = (props) => render(<Stage {...props} onReady={(f) => (closeFn = f)} />)

beforeEach(() => {
  sent = []
  vi.useFakeTimers()
  vi.stubGlobal(
    'fetch',
    vi.fn((url, init) => {
      if (String(url).includes('/api/livekit/session')) sent.push(JSON.parse(init.body))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
    })
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useCallSession', () => {
  it('не открывает учёт, пока тьютор не подключился', () => {
    // Между выдачей токена и приходом тьютора ученик просто ждёт — минуты за
    // это время списываться не должны.
    mount({ room: 'jts-tutor-1', tutorPresent: false })
    act(() => vi.advanceTimersByTime(PING_INTERVAL_MS * 3))
    expect(events()).toEqual([])
  })

  it('включает учёт в момент появления тьютора, один раз', () => {
    const { rerender } = mount({ room: 'jts-tutor-1', tutorPresent: false })
    act(() => {
      rerender(<Stage room="jts-tutor-1" tutorPresent onReady={(f) => (closeFn = f)} />)
    })
    expect(events()).toEqual(['armed'])
    expect(sent[0]).toMatchObject({ room: 'jts-tutor-1', event: 'armed' })

    // Агент моргнул и вернулся — начало отсчёта не должно сдвигаться.
    act(() => {
      rerender(
        <Stage room="jts-tutor-1" tutorPresent={false} onReady={(f) => (closeFn = f)} />
      )
      rerender(<Stage room="jts-tutor-1" tutorPresent onReady={(f) => (closeFn = f)} />)
    })
    expect(events()).toEqual(['armed'])
  })

  it('держит пульс, пока разговор идёт', () => {
    mount({ room: 'jts-tutor-1', tutorPresent: true })
    act(() => vi.advanceTimersByTime(PING_INTERVAL_MS * 2 + 100))
    expect(events()).toEqual(['armed', 'ping', 'ping'])
  })

  it('закрывает сессию по концу разговора и больше не пингует', () => {
    mount({ room: 'jts-tutor-1', tutorPresent: true })
    act(() => vi.advanceTimersByTime(PING_INTERVAL_MS + 100))
    act(() => closeFn())
    expect(events()).toEqual(['armed', 'ping', 'closed'])

    act(() => vi.advanceTimersByTime(PING_INTERVAL_MS * 3))
    expect(events()).toEqual(['armed', 'ping', 'closed'])
  })

  it('повторное завершение не шлёт второй closed', () => {
    mount({ room: 'jts-tutor-1', tutorPresent: true })
    act(() => {
      closeFn()
      closeFn()
    })
    expect(events()).toEqual(['armed', 'closed'])
  })

  it('без тьютора завершать нечего', () => {
    mount({ room: 'jts-tutor-1', tutorPresent: false })
    act(() => closeFn())
    expect(events()).toEqual([])
  })
})
