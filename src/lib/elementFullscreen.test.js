/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  requestElementFullscreen,
  exitFullscreen,
  getFullscreenElement,
  onFullscreenChange,
} from './elementFullscreen.js'

// jsdom: fullscreenElement — read-only getter, поэтому подменяем его свойством.
function pretendFullscreen(el) {
  Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true })
}

afterEach(() => {
  delete document.documentElement.requestFullscreen
  delete document.exitFullscreen
  try { pretendFullscreen(null) } catch {}
})

describe('element fullscreen helper', () => {
  // Читалка просит полный экран для своего корня, а не для страницы: иначе
  // сайдбар и шапка остаются в раскладке и высота не прибавляется.
  it('requests fullscreen on the given element', async () => {
    const el = document.createElement('div')
    const fn = vi.fn(() => { pretendFullscreen(el); return Promise.resolve() })
    el.requestFullscreen = fn
    document.documentElement.requestFullscreen = vi.fn()
    await expect(requestElementFullscreen(el)).resolves.toBe(true)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(document.documentElement.requestFullscreen).not.toHaveBeenCalled()
  })

  it('is a no-op when the element is already fullscreen', async () => {
    const el = document.createElement('div')
    const fn = vi.fn(() => Promise.resolve())
    el.requestFullscreen = fn
    pretendFullscreen(el)
    await expect(requestElementFullscreen(el)).resolves.toBe(true)
    expect(fn).not.toHaveBeenCalled()
  })

  // По false вызывающий код включает свой оверлей, поэтому важны все три
  // случая отказа: API нет (iOS Safari), запрос отклонён (политика разрешений)
  // и — самый подлый — обещание сдержано, а полного экрана нет (вебвью).
  it('reports failure when the API is missing', async () => {
    await expect(requestElementFullscreen(document.createElement('div'))).resolves.toBe(false)
    await expect(requestElementFullscreen(null)).resolves.toBe(false)
  })

  it('reports failure when the browser rejects the request', async () => {
    const el = document.createElement('div')
    el.requestFullscreen = vi.fn(() => Promise.reject(new TypeError('Permissions check failed')))
    await expect(requestElementFullscreen(el)).resolves.toBe(false)
  })

  it('reports failure when the promise resolves but nothing goes fullscreen', async () => {
    const el = document.createElement('div')
    el.requestFullscreen = vi.fn(() => Promise.resolve())
    await expect(requestElementFullscreen(el)).resolves.toBe(false)
  })

  // Встреченный случай: вебвью принимает запрос и не отвечает вовсе. Ждать
  // такое обещание нельзя — читалка осталась бы вообще без режима.
  it('reports failure when the request never settles', async () => {
    const el = document.createElement('div')
    el.requestFullscreen = vi.fn(() => new Promise(() => {}))
    await expect(requestElementFullscreen(el)).resolves.toBe(false)
  })

  // Старый prefixed-API ничего не возвращает — верим только элементу.
  it('accepts a void prefixed request that did go fullscreen', async () => {
    const el = document.createElement('div')
    el.webkitRequestFullscreen = vi.fn(() => pretendFullscreen(el))
    await expect(requestElementFullscreen(el)).resolves.toBe(true)
    expect(el.webkitRequestFullscreen).toHaveBeenCalledTimes(1)
  })

  it('exitFullscreen exits only when something is fullscreen', () => {
    const exit = vi.fn(() => Promise.resolve())
    document.exitFullscreen = exit
    exitFullscreen()
    expect(exit).not.toHaveBeenCalled()
    const el = document.createElement('div')
    pretendFullscreen(el)
    expect(getFullscreenElement()).toBe(el)
    exitFullscreen()
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('onFullscreenChange subscribes and unsubscribes', () => {
    const cb = vi.fn()
    const off = onFullscreenChange(cb)
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(cb).toHaveBeenCalledTimes(1)
    off()
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
