import { describe, it, expect } from 'vitest'
import { statusKey, canControl, canJoinLive } from './liveStatus.js'

describe('liveStatus', () => {
  it('maps backend statuses to i18n keys', () => {
    expect(statusKey('IN_PROGRESS')).toBe('inProgress')
    expect(statusKey('PAUSED')).toBe('paused')
    expect(statusKey('COMPLETED')).toBe('completed')
    expect(statusKey('CANCELLED')).toBe('cancelled')
    expect(statusKey('SCHEDULED')).toBe('scheduled')
    expect(statusKey('WHATEVER')).toBe('scheduled')
  })
  it('canControl only for staff roles', () => {
    expect(canControl('TEACHER')).toBe(true)
    expect(canControl('ADMIN')).toBe(true)
    expect(canControl('MANAGER')).toBe(true)
    expect(canControl('STUDENT')).toBe(false)
    expect(canControl(null)).toBe(false)
  })
  it('canJoinLive only when live/paused', () => {
    expect(canJoinLive('IN_PROGRESS')).toBe(true)
    expect(canJoinLive('PAUSED')).toBe(true)
    expect(canJoinLive('SCHEDULED')).toBe(false)
  })
})
