import { describe, it, expect } from 'vitest'
import { statusKey, canControl, contentLocked } from './liveStatus.js'

describe('liveStatus', () => {
  it('maps backend statuses to i18n keys', () => {
    expect(statusKey('IN_PROGRESS')).toBe('inProgress')
    expect(statusKey('PAUSED')).toBe('paused')
    expect(statusKey('COMPLETED')).toBe('completed')
    expect(statusKey('CANCELLED')).toBe('cancelled')
    expect(statusKey('SCHEDULED')).toBe('scheduled')
    expect(statusKey('WHATEVER')).toBe('scheduled')
  })
  // Ответы закрыты ровно у одного — у преподавателя: он читает работу ученика.
  // Ученику урок не запирается ни в одном состоянии (spec-lesson-always-open).
  it('закрыто только преподавательское полотно', () => {
    expect(contentLocked(true)).toBe(true)
    expect(contentLocked(false)).toBe(false)
    expect(contentLocked(undefined)).toBe(false)
  })

  it('canControl only for staff roles', () => {
    expect(canControl('TEACHER')).toBe(true)
    expect(canControl('ADMIN')).toBe(true)
    expect(canControl('MANAGER')).toBe(true)
    expect(canControl('STUDENT')).toBe(false)
    expect(canControl(null)).toBe(false)
  })
})
