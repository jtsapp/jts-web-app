import { describe, it, expect } from 'vitest'
import { statusKey, canControl, canJoinLive, contentLocked, contentLockNoteKey } from './liveStatus.js'

describe('liveStatus', () => {
  it('maps backend statuses to i18n keys', () => {
    expect(statusKey('IN_PROGRESS')).toBe('inProgress')
    expect(statusKey('PAUSED')).toBe('paused')
    expect(statusKey('COMPLETED')).toBe('completed')
    expect(statusKey('CANCELLED')).toBe('cancelled')
    expect(statusKey('SCHEDULED')).toBe('scheduled')
    expect(statusKey('WHATEVER')).toBe('scheduled')
  })
  // Ученик на перерыве получал закрытые кнопки и ни слова о том, почему они
  // закрыты: баннер перерыва висит наверху страницы, а он смотрит в задание.
  it('ответы закрыты на перерыве, после урока и у преподавателя', () => {
    expect(contentLocked('PAUSED', false)).toBe(true)
    expect(contentLocked('COMPLETED', false)).toBe(true)
    expect(contentLocked('IN_PROGRESS', true)).toBe(true)
    expect(contentLocked('IN_PROGRESS', false)).toBe(false)
    expect(contentLocked('SCHEDULED', false)).toBe(false)
  })

  it('причина блокировки есть у ученика и молчит у преподавателя', () => {
    expect(contentLockNoteKey('PAUSED', false)).toBe('lesson.ws.lockedPaused')
    expect(contentLockNoteKey('COMPLETED', false)).toBe('lesson.ws.lockedFinished')
    expect(contentLockNoteKey('IN_PROGRESS', false)).toBe('')
    expect(contentLockNoteKey('PAUSED', true)).toBe('')
  })

  // Строка объясняет блокировку — значит, есть ровно тогда, когда та есть.
  it('строка появляется только там, где ответы закрыты', () => {
    for (const status of ['SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']) {
      if (contentLockNoteKey(status, false)) {
        expect(contentLocked(status, false)).toBe(true)
      }
    }
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
