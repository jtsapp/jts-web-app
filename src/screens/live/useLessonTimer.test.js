// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLessonTimer, formatTimer } from './useLessonTimer.js'

/**
 * Таймер урока у ученика.
 *
 * Был личным секундомером преподавателя: ученик не видел ни того, что время
 * пошло, ни сколько осталось. Теперь отсчёт уходит всему классу, а считает его
 * каждый клиент сам — от момента получения события.
 */
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useLessonTimer', () => {
  it('до события таймера нет', () => {
    const { result } = renderHook(() => useLessonTimer())

    expect(result.current.remaining).toBeNull()
    expect(result.current.expired).toBe(false)
  })

  it('старт заводит отсчёт на присланную длительность', () => {
    const { result } = renderHook(() => useLessonTimer())

    act(() => result.current.onTimer({ action: 'start', durationSeconds: 90 }))

    expect(result.current.remaining).toBe(90)
  })

  /* Тик берёт время у часов, а не вычитает по секунде: вкладка в фоне
     подмораживает setInterval, и вычитание отстало бы ровно на столько, сколько
     ученик смотрел в другое окно. */
  it('считает по настоящим часам, а не по числу тиков', () => {
    const { result } = renderHook(() => useLessonTimer())
    act(() => result.current.onTimer({ action: 'start', durationSeconds: 60 }))

    // Одиннадцать секунд прошло — сколько бы тиков ни успело случиться.
    act(() => { vi.advanceTimersByTime(11_000) })

    expect(result.current.remaining).toBe(49)
  })

  /* Ноль не прячем: «время вышло» должно остаться на экране, иначе ученик
     прочитает исчезнувший таймер как «сломалось», а не как «всё». */
  it('на нуле останавливается и помечается истёкшим', () => {
    const { result } = renderHook(() => useLessonTimer())
    act(() => result.current.onTimer({ action: 'start', durationSeconds: 2 }))

    act(() => { vi.advanceTimersByTime(5_000) })

    expect(result.current.remaining).toBe(0)
    expect(result.current.expired).toBe(true)
  })

  it('стоп убирает таймер совсем', () => {
    const { result } = renderHook(() => useLessonTimer())
    act(() => result.current.onTimer({ action: 'start', durationSeconds: 60 }))

    act(() => result.current.onTimer({ action: 'stop' }))

    expect(result.current.remaining).toBeNull()
    expect(result.current.expired).toBe(false)
  })

  it('новый старт перебивает предыдущий отсчёт', () => {
    const { result } = renderHook(() => useLessonTimer())
    act(() => result.current.onTimer({ action: 'start', durationSeconds: 60 }))
    act(() => { vi.advanceTimersByTime(30_000) })

    act(() => result.current.onTimer({ action: 'start', durationSeconds: 120 }))

    expect(result.current.remaining).toBe(120)
  })

  /* Мусорное событие не должно оставлять «00:00» на экране до конца урока. */
  it('старт без длительности ничего не заводит', () => {
    const { result } = renderHook(() => useLessonTimer())

    act(() => result.current.onTimer({ action: 'start' }))

    expect(result.current.remaining).toBeNull()
  })
})

describe('formatTimer', () => {
  it('секунды в мм:сс', () => {
    expect(formatTimer(95)).toBe('01:35')
    expect(formatTimer(0)).toBe('00:00')
    expect(formatTimer(600)).toBe('10:00')
  })

  it('отрицательное и мусор — нули, а не NaN', () => {
    expect(formatTimer(-5)).toBe('00:00')
    expect(formatTimer(undefined)).toBe('00:00')
  })
})
