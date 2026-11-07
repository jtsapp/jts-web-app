import { describe, it, expect, beforeEach, vi } from 'vitest'
import { appTheme, createLessonFrameTheme } from './lessonFrameTheme.js'

describe('createLessonFrameTheme', () => {
  let listener
  let theme
  let frames
  const host = {
    addEventListener: (_, fn) => { listener = fn },
    removeEventListener: () => { listener = null },
  }
  const frame = () => ({ closed: false, postMessage: vi.fn() })
  const request = (source, data = { source: 'jts-theme', type: 'request' }) => listener({ data, source })
  const message = (value) => ({ source: 'jts-workspace', type: 'theme', theme: value })

  beforeEach(() => {
    theme = 'dark'
    frames = createLessonFrameTheme(host, () => theme)
  })

  it('отвечает темой рамке, которая её запросила', () => {
    const asked = frame()
    request(asked)
    expect(asked.postMessage).toHaveBeenCalledWith(message('dark'), '*')
  })

  it('при смене темы сообщает только запросившим рамкам', () => {
    const asked = frame()
    const silent = frame()
    request(asked)
    theme = 'light'
    frames.themeChanged()
    expect(asked.postMessage).toHaveBeenLastCalledWith(message('light'), '*')
    expect(silent.postMessage).not.toHaveBeenCalled()
  })

  it('не отвечает на чужие сообщения', () => {
    const other = frame()
    request(other, { source: 'jts-lesson', type: 'stage' })
    request(other, null)
    expect(other.postMessage).not.toHaveBeenCalled()
  })

  it('не пишет закрытой рамке', () => {
    const gone = frame()
    request(gone)
    gone.postMessage.mockClear()
    gone.closed = true
    frames.themeChanged()
    expect(gone.postMessage).not.toHaveBeenCalled()
  })
})

describe('appTheme', () => {
  it('читает тему с корня приложения', () => {
    expect(appTheme({ getAttribute: () => 'dark' })).toBe('dark')
    expect(appTheme({ getAttribute: () => null })).toBe('light')
  })
})
