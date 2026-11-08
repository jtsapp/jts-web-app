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

  // ТЗ v2.0, 7.2б: «Подсказать?» — после первой неверной проверки.
  it('первая неверная проверка — облачко errors', async () => {
    const { result } = watch()
    press('go')
    markWrong('a')
    await later(900)
    expect(result.current.offer).toEqual({ reason: 'errors' })
  })

  it('onWrong вернул true (окно дало ступень само) — облачка нет; окно открыто — ошибка всё равно доходит', async () => {
    const onWrong = vi.fn(() => true)
    const { result } = watch({ onWrong, canOffer: () => false })
    press('go')
    markWrong('a')
    await later(900)
    expect(onWrong).toHaveBeenCalledTimes(1)
    expect(result.current.offer).toBe(null)
    press('go')
    markWrong('b')
    await later(900)
    expect(onWrong).toHaveBeenCalledTimes(2)
  })

  it('onWrong вернул false — облачко как обычно', async () => {
    const onWrong = vi.fn(() => false)
    const { result } = watch({ onWrong })
    press('go')
    markWrong('a')
    await later(900)
    expect(onWrong).toHaveBeenCalledTimes(1)
    expect(result.current.offer).toEqual({ reason: 'errors' })
  })

  it('при пороге две — две неверные проверки подряд — облачко errors; оно уходит само через showMs', async () => {
    const { result } = watch({ opts: { wrongLimit: 2 } })
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
    const { result } = watch({ opts: { wrongLimit: 2 } })
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
    const { result } = watch({ opts: { wrongLimit: 2 } })
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
    const { result } = watch({ opts: { wrongLimit: 2 } })
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

  it('dismiss (окно открылось само) — облачко уходит, пропущенным не считается', async () => {
    // Простой здесь не нужен — только ошибки.
    const { result } = watch({ opts: { ignoreLimit: 1, idleMs: 1e9 } })
    press('go')
    markWrong('a')
    await later(900)
    expect(result.current.offer).toEqual({ reason: 'errors' })
    act(() => result.current.dismiss())
    expect(result.current.offer).toBe(null)
    // Пропуском не засчитано: при ignoreLimit 1 облачко после пропуска больше не вышло бы.
    await later(STUCK.cooldownMs)
    press('go')
    markWrong('b')
    await later(900)
    expect(result.current.offer).toEqual({ reason: 'errors' })
  })

  it(`простой: «Подсказать?», ещё ${STUCK.idle2Ms / 1000} с — «Передохнуть?» (idle2), дальше тишина`, async () => {
    const { result } = watch()
    await later(STUCK.idleMs + 6000)
    expect(result.current.offer).toEqual({ reason: 'idle' })
    // Не нажал — облачко уходит; простой продолжается.
    await later(STUCK.showMs + 1000)
    expect(result.current.offer).toBe(null)
    // Второй уровень — через idle2Ms после первого (часы простоя идут от последнего действия, а не от облачка).
    await later(STUCK.idleMs + STUCK.idle2Ms + 4000 - (STUCK.idleMs + 6000 + STUCK.showMs + 1000))
    expect(result.current.offer).toEqual({ reason: 'idle2' })
    await later(STUCK.showMs + 1000)
    await later(STUCK.cooldownMs * 2)
    expect(result.current.offer).toBe(null)
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
