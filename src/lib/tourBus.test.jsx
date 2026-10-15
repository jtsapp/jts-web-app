// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import {
  TOUR_REQUEST_TTL_MS,
  cancelTourRequest,
  onTourEvent,
  requestTour,
  takeTourRequest,
  tourRequestPending,
  useTourRequest,
} from './tourBus.js'

function Screen({ start }) {
  useTourRequest(start)
  return null
}

describe('заявка Луны на тур', () => {
  afterEach(() => {
    cancelTourRequest()
    vi.useRealTimers()
  })

  it('экран с «?» забирает заявку сразу — один раз', () => {
    const start = vi.fn()
    render(<Screen start={start} />)
    requestTour()
    expect(start).toHaveBeenCalledTimes(1)
    expect(tourRequestPending()).toBe(false)
  })

  it('заявка ждёт экран, который появится позже, и кнопку «?», которая появится ещё позже', () => {
    requestTour()
    const start = vi.fn()
    const { rerender } = render(<Screen start={undefined} />)
    expect(start).not.toHaveBeenCalled()
    expect(tourRequestPending()).toBe(true)
    rerender(<Screen start={start} />)
    expect(start).toHaveBeenCalledTimes(1)
    expect(tourRequestPending()).toBe(false)
  })

  it('старая заявка гаснет сама', () => {
    vi.useFakeTimers()
    requestTour()
    vi.advanceTimersByTime(TOUR_REQUEST_TTL_MS + 1)
    expect(takeTourRequest()).toBe(false)
    const start = vi.fn()
    render(<Screen start={start} />)
    expect(start).not.toHaveBeenCalled()
  })

  it('события шага и конца доходят до подписчика', () => {
    const events = []
    const off = onTourEvent((e) => events.push(e.type))
    requestTour()
    off()
    requestTour()
    expect(events).toEqual(['request'])
  })
})
