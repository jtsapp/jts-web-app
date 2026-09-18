// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEmotionShowcase } from './useEmotionShowcase.js'
import { showcaseFrom } from './avatarEmotions.js'

// Шаг круга — setState из таймера, поэтому часы двигаем внутри act.
const tick = (ms) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe('useEmotionShowcase', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    // matchMedia подменяем через stubGlobal — снятие вернёт то, что было до
    // теста. hidden — геттер прототипа документа: своя подмена снимается delete.
    vi.unstubAllGlobals()
    delete document.hidden
  })

  it('начинает с родной эмоции и знает следующую', () => {
    const { result } = renderHook(() => useEmotionShowcase('angry'))
    expect(result.current).toEqual({ emotion: 'angry', next: 'rage' })
  })

  it('шагает раз в dwell и замыкает круг', () => {
    const order = showcaseFrom('happy')
    const { result } = renderHook(() => useEmotionShowcase('happy', 3000))
    tick(2999)
    expect(result.current.emotion).toBe('happy')
    tick(1)
    expect(result.current).toEqual({ emotion: order[1], next: order[2] })
    tick(3000 * (order.length - 1))
    expect(result.current.emotion).toBe('happy')
  })

  it('сменился тьютор — круг заново с его родной эмоции и с полным шагом', () => {
    const { result, rerender } = renderHook(({ mood }) => useEmotionShowcase(mood), {
      initialProps: { mood: 'happy' },
    })
    // Смена посреди шага: без перезапуска таймера новая родная эмоция
    // продержалась бы только остаток чужого шага.
    tick(7000)
    rerender({ mood: 'idle' })
    expect(result.current.emotion).toBe('idle')
    tick(2999)
    expect(result.current.emotion).toBe('idle')
    tick(1)
    expect(result.current.emotion).toBe('listening')
  })

  it('при «уменьшить движение» стоит на родной эмоции и ничего не подгружает', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    const { result } = renderHook(() => useEmotionShowcase('angry'))
    tick(9000)
    expect(result.current).toEqual({ emotion: 'angry', next: null })
  })

  it('«уменьшить движение» на лету: включили — встал на родной, выключили — круг заново с неё', () => {
    const listeners = new Set()
    const mq = {
      matches: false,
      addEventListener: (_, fn) => listeners.add(fn),
      removeEventListener: (_, fn) => listeners.delete(fn),
    }
    vi.stubGlobal('matchMedia', () => mq)
    const flip = (on) =>
      act(() => {
        mq.matches = on
        listeners.forEach((fn) => fn())
      })

    const { result } = renderHook(() => useEmotionShowcase('angry'))
    tick(6000)
    expect(result.current.emotion).toBe('sympathy')
    flip(true)
    expect(result.current).toEqual({ emotion: 'angry', next: null })
    flip(false)
    expect(result.current).toEqual({ emotion: 'angry', next: 'rage' })
    tick(3000)
    expect(result.current.emotion).toBe('rage')
  })

  it('на скрытой вкладке круг стоит, вернулся — идёт дальше', () => {
    const { result } = renderHook(() => useEmotionShowcase('idle'))
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    tick(9000)
    expect(result.current.emotion).toBe('idle')
    delete document.hidden
    tick(3000)
    expect(result.current.emotion).toBe('listening')
  })
})
