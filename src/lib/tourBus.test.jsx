// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import {
  TOUR_REQUEST_TTL_MS,
  cancelTourRequest,
  holdTours,
  onTourEvent,
  requestTour,
  takeTourRequest,
  tourRequestPending,
  useTourRequest,
  useToursHeld,
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

describe('пауза туров на время окна приложения', () => {
  afterEach(() => {
    holdTours('a', false)
    holdTours('b', false)
  })

  function Probe({ seen }) {
    seen.push(useToursHeld())
    return null
  }

  it('тур на паузе, пока держит хоть одна причина', () => {
    const seen = []
    render(<Probe seen={seen} />)
    expect(seen.at(-1)).toBe(false)
    act(() => holdTours('a', true))
    expect(seen.at(-1)).toBe(true)
    act(() => holdTours('b', true))
    act(() => holdTours('a', false))
    expect(seen.at(-1)).toBe(true)
    act(() => holdTours('b', false))
    expect(seen.at(-1)).toBe(false)
  })

  it('повторное снятие одной причины не снимает чужую', () => {
    holdTours('a', true)
    holdTours('b', false)
    holdTours('b', false)
    const seen = []
    render(<Probe seen={seen} />)
    expect(seen.at(-1)).toBe(true)
  })
})
