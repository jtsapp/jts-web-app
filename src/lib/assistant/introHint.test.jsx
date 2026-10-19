// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { HINT_DELAY_MS, HINT_SHOW_MS, hasMet, useIntroHint } from './introHint.js'

// Облачко «Я Луна…»: пока ученик не открывал Луну — на каждом новом экране, раз за
// визит; ушло само, от нажатия или навсегда — после первого открытия окна.
const hook = (props) =>
  renderHook((p) => useIntroHint(p), { initialProps: { screen: 'home', active: true, open: false, ...props } })

describe('облачко-знакомство с Луной', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('новый ученик: выезжает с задержкой и уходит само', () => {
    const { result } = hook()
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS))
    expect(result.current).toBe(true)
    act(() => vi.advanceTimersByTime(HINT_SHOW_MS))
    expect(result.current).toBe(false)
  })

  it('на экране, где уже показывалось за визит, — нет; на новом — да', () => {
    const { result, rerender } = hook()
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS))
    expect(result.current).toBe(true)
    rerender({ screen: 'practice', active: true, open: false })
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS))
    expect(result.current).toBe(true)
    rerender({ screen: 'home', active: true, open: false })
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS + HINT_SHOW_MS))
    expect(result.current).toBe(false)
  })

  it('первое нажатие или клавиша — уходит: ученик взялся за дело', () => {
    const { result } = hook()
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS))
    expect(result.current).toBe(true)
    act(() => window.dispatchEvent(new Event('pointerdown')))
    expect(result.current).toBe(false)
  })

  it('открыл Луну хоть раз — облачка больше нет нигде', () => {
    const { result, rerender } = hook()
    rerender({ screen: 'home', active: true, open: true })
    expect(hasMet()).toBe(true)
    rerender({ screen: 'practice', active: true, open: false })
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS + 100))
    expect(result.current).toBe(false)
  })

  it('кнопка занята (звонок) — не показывается', () => {
    const { result } = hook({ active: false })
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS + 100))
    expect(result.current).toBe(false)
  })
})
