/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { isFullscreenSupported, requestAppFullscreen, exitAppFullscreen } from './fullscreen.js'

afterEach(() => {
  delete document.documentElement.requestFullscreen
  delete document.exitFullscreen
  // jsdom: fullscreenElement is a read-only getter → redefine per test as needed
  try { Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true }) } catch {}
})

describe('fullscreen helper', () => {
  it('reports support when requestFullscreen exists', () => {
    document.documentElement.requestFullscreen = vi.fn()
    expect(isFullscreenSupported()).toBe(true)
  })

  it('requestAppFullscreen calls the element method when not already fullscreen', () => {
    const fn = vi.fn(() => Promise.resolve())
    document.documentElement.requestFullscreen = fn
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
    requestAppFullscreen()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('requestAppFullscreen is a no-op when already fullscreen', () => {
    const fn = vi.fn(() => Promise.resolve())
    document.documentElement.requestFullscreen = fn
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, configurable: true })
    requestAppFullscreen()
    expect(fn).not.toHaveBeenCalled()
  })

  it('requestAppFullscreen is a no-op when unsupported', () => {
    expect(() => requestAppFullscreen()).not.toThrow()
  })

  it('exitAppFullscreen exits only when currently fullscreen', () => {
    const exit = vi.fn(() => Promise.resolve())
    document.exitFullscreen = exit
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, configurable: true })
    exitAppFullscreen()
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('exitAppFullscreen is a no-op when not fullscreen', () => {
    const exit = vi.fn(() => Promise.resolve())
    document.exitFullscreen = exit
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
    exitAppFullscreen()
    expect(exit).not.toHaveBeenCalled()
  })
})
