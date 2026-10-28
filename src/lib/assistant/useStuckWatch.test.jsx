// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { STUCK } from './stuck.js'
import { stuckBlocked, useStuckWatch } from './useStuckWatch.js'

// Экран урока: два варианта и «Проверить». Сайт помечает выбранный неверный
// классом is-wrong — ту же пометку снимок читает как «(отмечено как неверное)».
function mountLesson({ test = false } = {}) {
  document.body.innerHTML = `
    <div class="scr-in"${test ? ' data-assistant-test=""' : ''}>
      <p>He ___ football every day.</p>
      <button id="a">play</button><button id="b">plays</button><button id="go">Проверить</button>
    </div>
    <button id="outside">кнопка окна</button>`
}
const $ = (id) => document.getElementById(id)
const press = (id) => act(() => $(id).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true })))
const later = (ms) => act(() => vi.advanceTimersByTime(ms))
const markWrong = (id) => {
  for (const b of document.querySelectorAll('.scr-in button')) b.className = ''
  if (id) $(id).className = 'is-wrong'
}

describe('useStuckWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mountLesson()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  const watch = (props = {}) =>
    renderHook((p) => useStuckWatch({ active: true, screen: 'kingdom-interior', ...p }), { initialProps: props })

  it('две неверные проверки подряд — облачко errors; оно уходит само через showMs', async () => {
    const { result } = watch()
    press('go')
    markWrong('a')
    await later(900)
    expect(result.current.offer).toBe(null)
    press('go')
    markWrong('b')
    await later(900)
    expect(result.current.offer).toEqual({ reason: 'errors' })
    await later(STUCK.showMs + 10)
    expect(result.current.offer).toBe(null)
  })

  // Ученик жмёт «Продолжить» быстрее, чем через 0.8 с после ошибки: снимок после
  // проверки увидел бы уже следующее задание. Поэтому экран снимается и в момент
  // клика — до того, как клик его поменял (съёмка облачка 28.10 так ошибку теряла).
  it('ошибка, сразу «Продолжить» — ошибка всё равно засчитана', async () => {
    const { result } = watch()
    press('go')
    markWrong('a')
    await later(100)
    press('go') // «Продолжить»: в момент клика на экране ещё пометка первой ошибки
    markWrong(null)
    await later(2100)
    press('go')
    markWrong('b')
    await later(900)
    expect(result.current.offer).toEqual({ reason: 'errors' })
  })

  it('take — причина для пометки и облачко уходит', async () => {
    const { result } = watch()
    press('go')
    markWrong('a')
    await later(900)
    press('go')
    markWrong('b')
    await later(900)
    let reason
    act(() => {
      reason = result.current.take()
    })
    expect(reason).toBe('errors')
    expect(result.current.offer).toBe(null)
  })

  it('ученик снова взялся за задание — облачко уходит; клик вне экрана — нет', async () => {
    const { result } = watch()
    press('go')
    markWrong('a')
    await later(900)
    press('go')
    markWrong('b')
    await later(900)
    press('outside')
    expect(result.current.offer).toEqual({ reason: 'errors' })
    press('a')
    expect(result.current.offer).toBe(null)
  })

  it('на тесте облачка нет', async () => {
    mountLesson({ test: true })
    const { result } = watch()
    press('go')
    markWrong('a')
    await later(900)
    press('go')
    markWrong('b')
    await later(900)
    expect(result.current.offer).toBe(null)
  })

  it('виджет занят (canOffer → false) — облачка нет', async () => {
    const { result } = watch({ canOffer: () => false })
    press('go')
    markWrong('a')
    await later(900)
    press('go')
    markWrong('b')
    await later(900)
    expect(result.current.offer).toBe(null)
  })

  it(`простой ${STUCK.idleMs / 1000} с на экране с заданием — idle`, async () => {
    const { result } = watch()
    await later(STUCK.idleMs - 6000)
    expect(result.current.offer).toBe(null)
    await later(12_000)
    expect(result.current.offer).toEqual({ reason: 'idle' })
  })

  it('окно открыли (active → false) — облачко уходит, пропущенным не считается', async () => {
    const { result, rerender } = watch()
    await later(STUCK.idleMs + 6000)
    expect(result.current.offer).toEqual({ reason: 'idle' })
    rerender({ active: false })
    expect(result.current.offer).toBe(null)
  })
})

describe('stuckBlocked', () => {
  it('тест и тур — нельзя; обычный экран — можно', () => {
    document.body.innerHTML = '<div class="scr-in"><div data-assistant-test=""></div></div>'
    expect(stuckBlocked(document.querySelector('.scr-in'))).toBe(true)
    document.body.innerHTML = '<div class="scr-in"></div><div class="t-tour__pop"></div>'
    expect(stuckBlocked(document.querySelector('.scr-in'))).toBe(true)
    document.body.innerHTML = '<div class="scr-in"></div>'
    expect(stuckBlocked(document.querySelector('.scr-in'))).toBe(false)
    expect(stuckBlocked(null)).toBe(true)
  })
})
