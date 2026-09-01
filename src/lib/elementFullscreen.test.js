/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isElementFullscreenSupported,
  requestElementFullscreen,
  exitFullscreen,
  getFullscreenElement,
  onFullscreenChange,
} from './elementFullscreen.js'

afterEach(() => {
  delete document.documentElement.requestFullscreen
  delete document.exitFullscreen
  // jsdom: fullscreenElement — read-only getter, переопределяем на каждый тест
  try { Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true }) } catch {}
})

describe('element fullscreen helper', () => {
  it('reports support when requestFullscreen exists', () => {
    document.documentElement.requestFullscreen = vi.fn()
    expect(isElementFullscreenSupported()).toBe(true)
  })

  it('reports no support without the API', () => {
    expect(isElementFullscreenSupported()).toBe(false)
  })

  // Читалка просит полный экран для своего корня, а не для страницы: иначе
  // сайдбар и шапка остаются в раскладке и высота не прибавляется.
  it('requests fullscreen on the given element', () => {
    const el = document.createElement('div')
    const fn = vi.fn(() => Promise.resolve())
    el.requestFullscreen = fn
    document.documentElement.requestFullscreen = vi.fn()
    requestElementFullscreen(el)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(document.documentElement.requestFullscreen).not.toHaveBeenCalled()
  })

  it('is a no-op when the element is already fullscreen', () => {
    const el = document.createElement('div')
    const fn = vi.fn(() => Promise.resolve())
    el.requestFullscreen = fn
    Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true })
    requestElementFullscreen(el)
    expect(fn).not.toHaveBeenCalled()
  })

  it('is a no-op without an element or without the API', () => {
    expect(() => requestElementFullscreen(null)).not.toThrow()
    expect(() => requestElementFullscreen(document.createElement('div'))).not.toThrow()
  })

  it('exitFullscreen exits only when something is fullscreen', () => {
    const exit = vi.fn(() => Promise.resolve())
    document.exitFullscreen = exit
    exitFullscreen()
    expect(exit).not.toHaveBeenCalled()
    const el = document.createElement('div')
    Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true })
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
