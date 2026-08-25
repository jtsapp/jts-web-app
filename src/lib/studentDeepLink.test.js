import { describe, it, expect } from 'vitest'
import { notificationTarget } from './studentDeepLink.js'

describe('notificationTarget', () => {
  it('opens a live lesson from the teacher workspace route', () => {
    expect(notificationTarget('/system/schedule/42/workspace')).toEqual({
      screen: 'lessons',
      payload: { lessonId: 42 },
    })
  })

  it('maps homework links from both apps', () => {
    expect(notificationTarget('homework').screen).toBe('homework')
    expect(notificationTarget('/system/homework').screen).toBe('homework')
  })

  it('maps schedule links to the lessons screen', () => {
    expect(notificationTarget('lessons').screen).toBe('lessons')
    expect(notificationTarget('/system/schedule').screen).toBe('lessons')
  })

  it('returns a null screen for empty or unknown links', () => {
    expect(notificationTarget(null).screen).toBeNull()
    expect(notificationTarget('/system/unknown').screen).toBeNull()
  })
})
