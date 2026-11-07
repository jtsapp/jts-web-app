// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

vi.mock('../../api.js', () => ({
  getGePlan: vi.fn(),
  getTrialRequestState: vi.fn(),
}))

const api = await import('../../api.js')
const { LESSON_DONE_EVENT, useProactive } = await import('./useProactive.js')

const PLAN = {
  state: 'ready',
  today: '2026-11-07',
  shortDay: null,
  stopDay: null,
  tasks: [
    { id: 1, date: '2026-11-07', kind: 'course', status: 'available', minutes: 30 },
    { id: 2, date: '2026-11-07', kind: 'practice', module: 'ai_tutor', status: 'available', minutes: 15, got: 0 },
  ],
}

let hidden = false
const setHidden = (v) => {
  hidden = v
  document.dispatchEvent(new Event('visibilitychange'))
}
const later = (ms) => act(() => vi.advanceTimersByTimeAsync(ms))

function mount(props = {}) {
  const deliver = vi.fn()
  const view = renderHook((p) => useProactive(p), {
    initialProps: { token: 'tok', owner: 'user-1', screen: 'home', enabled: true, canDeliver: () => true, deliver, ...props },
  })
  return { ...view, deliver }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 7, 10, 0))
  localStorage.clear()
  sessionStorage.clear()
  document.body.innerHTML = '<div class="scr-in"><h1>Главная</h1></div>'
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  hidden = false
  api.getGePlan.mockResolvedValue(PLAN)
  api.getTrialRequestState.mockResolvedValue({ requested: false })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useProactive', () => {
  it('первый заход за день — начало дня с цифрами свежего плана', async () => {
    const { deliver } = mount()
    await later(3000)
    expect(deliver).toHaveBeenCalledTimes(1)
    expect(deliver.mock.calls[0][0]).toMatchObject({ type: 'day_start', params: { plan: 'ready', total: 2, left: 2, min: 45, next: 'course' } })
  })

  it('окно говорит «нельзя» — ждём; стало можно — уходит', async () => {
    let can = false
    const { deliver } = mount({ canDeliver: () => can })
    await later(6000)
    expect(deliver).not.toHaveBeenCalled()
    can = true
    await later(2500)
    expect(deliver).toHaveBeenCalledTimes(1)
  })

  it('вкладка снова видна через 6 минут — «вернулся после перерыва»', async () => {
    const { deliver } = mount()
    await later(3000)
    act(() => setHidden(true))
    await later(6 * 60_000)
    act(() => setHidden(false))
    await later(2500)
    expect(deliver.mock.calls.at(-1)[0]).toMatchObject({ type: 'return_after_pause', params: { away: 6 } })
  })

  it('на скрытой вкладке не говорит', async () => {
    hidden = true
    const { deliver } = mount()
    await later(10_000)
    expect(deliver).not.toHaveBeenCalled()
  })

  it('перерыв: таймер и по концу — «перерыв окончен»; пока идёт — ничего другого', async () => {
    const { result, deliver } = mount()
    await later(3000)
    deliver.mockClear()
    act(() => result.current.startBreak(5))
    expect(result.current.breakEndsAt).toBeGreaterThan(Date.now())
    await later(4 * 60_000)
    expect(deliver).not.toHaveBeenCalled()
    await later(65_000)
    expect(result.current.breakEndsAt).toBe(null)
    expect(deliver.mock.calls.at(-1)[0]).toMatchObject({ type: 'break_over' })
  })

  it('демо: урок пройден — пробный урок, если заявки нет', async () => {
    const { deliver } = mount({ demo: true })
    await later(3000)
    deliver.mockClear()
    await later(4 * 60_000)
    act(() => window.dispatchEvent(new CustomEvent(LESSON_DONE_EVENT, { detail: { first: true } })))
    await later(2500)
    expect(deliver.mock.calls.at(-1)[0]).toEqual({ type: 'demo_trial', params: { first: true } })
  })

  it('демо: заявка уже есть — не предлагаем', async () => {
    api.getTrialRequestState.mockResolvedValue({ requested: true })
    const { deliver } = mount({ demo: true })
    await later(3000)
    deliver.mockClear()
    await later(4 * 60_000)
    act(() => window.dispatchEvent(new CustomEvent(LESSON_DONE_EVENT, { detail: { first: true } })))
    await later(5000)
    expect(deliver).not.toHaveBeenCalled()
  })

  it('шаг закрыт по фактам — на переходе план перечитан, «шаг закрыт»', async () => {
    const { deliver, rerender } = mount()
    await later(3000)
    deliver.mockClear()
    await later(4 * 60_000)
    api.getGePlan.mockResolvedValue({ ...PLAN, tasks: [{ ...PLAN.tasks[0], status: 'completed' }, PLAN.tasks[1]] })
    rerender({ token: 'tok', owner: 'user-1', screen: 'practice', enabled: true, canDeliver: () => true, deliver })
    await later(4500)
    expect(deliver.mock.calls.at(-1)[0]).toMatchObject({ type: 'step_completed', params: { step: 'course', next: 'ai_tutor', left: 1 } })
  })

  it('выключено (звонок, экзамен) — ничего', async () => {
    const { deliver } = mount({ enabled: false })
    await later(10_000)
    expect(deliver).not.toHaveBeenCalled()
  })
})
