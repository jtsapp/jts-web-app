// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../lib/notifySound.js', () => ({ playCue: vi.fn() }))

import { playCue } from '../../lib/notifySound.js'
import { useLessonTimer, formatTimer } from './useLessonTimer.js'

/**
 * Таймер урока у ученика.
 *
 * Был личным секундомером преподавателя, потом — отсчётом от момента, когда
 * событие дошло до вкладки: вошедший позже ученик таймера не видел вовсе.
 * Теперь сервер хранит время окончания, и каждый клиент считает остаток до
 * него по часам сервера (`Date.now() + offset`).
 */
const NOW = 1790000000000
const timerFor = (seconds, from = NOW) => ({ endsAtMs: from + seconds * 1000, durationSeconds: seconds })

function render(timer, offset = 0) {
  return renderHook(({ timer: t, offset: o }) => useLessonTimer(t, o), { initialProps: { timer, offset } })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  playCue.mockClear()
})
afterEach(() => vi.useRealTimers())

describe('useLessonTimer', () => {
  it('без состояния и без таймера — пусто', () => {
    const { result, rerender } = render(undefined)
    expect(result.current.remaining).toBeNull()
    expect(result.current.expired).toBe(false)

    rerender({ timer: null, offset: 0 })
    expect(result.current.remaining).toBeNull()
  })

  it('остаток — до времени окончания', () => {
    const { result } = render(timerFor(90))
    expect(result.current.remaining).toBe(90)
  })

  // Часы ученика отстают от сервера на полминуты: остаток всё равно верный.
  it('считает по часам сервера — с поправкой offset', () => {
    const { result } = render(timerFor(90), 30_000)
    expect(result.current.remaining).toBe(60)
  })

  /* Тик берёт время у часов, а не вычитает по секунде: вкладка в фоне
     подмораживает setInterval, и вычитание отстало бы ровно на столько, сколько
     ученик смотрел в другое окно. */
  it('в фоне считает по часам, а не по числу тиков', () => {
    const { result } = render(timerFor(60))

    // Одиннадцать секунд прошло, а тик успел случиться один.
    vi.setSystemTime(NOW + 11_000)
    act(() => { vi.advanceTimersByTime(250) })

    expect(result.current.remaining).toBe(49)
  })

  /* Ноль не прячем: «время вышло» должно остаться на экране, иначе ученик
     прочитает исчезнувший таймер как «сломалось», а не как «всё». */
  it('на нуле останавливается и остаётся, пока таймер не снят', () => {
    const t = timerFor(2)
    const { result, rerender } = render(t)

    act(() => { vi.advanceTimersByTime(5_000) })
    expect(result.current.remaining).toBe(0)
    expect(result.current.expired).toBe(true)

    // Пришло новое состояние (сменилась стадия) — тот же таймер, ноль на месте.
    rerender({ timer: { ...t }, offset: 0 })
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(result.current.remaining).toBe(0)

    rerender({ timer: null, offset: 0 })
    expect(result.current.remaining).toBeNull()
    expect(result.current.expired).toBe(false)
  })

  it('новое время окончания перебивает прежний отсчёт', () => {
    const { result, rerender } = render(timerFor(60))
    act(() => { vi.advanceTimersByTime(30_000) })

    rerender({ timer: timerFor(120, NOW + 30_000), offset: 0 })

    expect(result.current.remaining).toBe(120)
  })

  it('таймер без времени окончания ничего не заводит', () => {
    const { result } = render({ durationSeconds: 60 })
    expect(result.current.remaining).toBeNull()
  })
})

describe('useLessonTimer — сигналы', () => {
  // Отсчёт начался без ученика: «пошло время» ему сейчас ничего не сообщает.
  it('вход в идущий таймер — без сигнала старта', () => {
    const { rerender } = render(undefined)
    rerender({ timer: timerFor(90), offset: 0 })
    expect(playCue).not.toHaveBeenCalledWith('timerStart')
  })

  it('новый таймер при уже полученном состоянии — сигнал старта', () => {
    const { rerender } = render(null)
    rerender({ timer: timerFor(90), offset: 0 })
    expect(playCue).toHaveBeenCalledWith('timerStart')
  })

  it('перезапуск (сменилось время окончания) — снова сигнал', () => {
    const { rerender } = render(null)
    rerender({ timer: timerFor(90), offset: 0 })
    playCue.mockClear()

    rerender({ timer: timerFor(120), offset: 0 })
    expect(playCue).toHaveBeenCalledWith('timerStart')
  })

  // Любое изменение состояния (стадия, указка) приносит тот же таймер заново.
  it('тот же таймер в новом состоянии — без сигнала', () => {
    const { rerender } = render(null)
    rerender({ timer: timerFor(90), offset: 0 })
    playCue.mockClear()

    rerender({ timer: timerFor(90), offset: 15 })
    expect(playCue).not.toHaveBeenCalled()
  })

  // Экран урока не пересоздаётся при смене занятия: вход в идущий таймер
  // другого урока — тоже вход, а не старт.
  it('состояние пропало и пришло заново — снова вход, без сигнала', () => {
    const { rerender } = render(null)
    rerender({ timer: undefined, offset: 0 })
    rerender({ timer: timerFor(90), offset: 0 })
    expect(playCue).not.toHaveBeenCalledWith('timerStart')
  })

  it('время вышло — сигнал один раз', () => {
    render(timerFor(1))
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(playCue.mock.calls.filter(([cue]) => cue === 'timerEnd')).toHaveLength(1)
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
