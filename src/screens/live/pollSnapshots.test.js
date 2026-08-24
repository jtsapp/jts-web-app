import { describe, expect, it } from 'vitest'
import { sameLessonSnapshot, sameMessageSnapshot } from './pollSnapshots.js'

describe('sameMessageSnapshot', () => {
  it('treats equal id/body lists as unchanged', () => {
    const a = [{ id: 1, body: 'hi' }]
    const b = [{ id: 1, body: 'hi' }]
    expect(sameMessageSnapshot(a, b)).toBe(true)
  })

  it('detects a new or edited message', () => {
    expect(sameMessageSnapshot([{ id: 1, body: 'a' }], [{ id: 1, body: 'b' }])).toBe(false)
    expect(sameMessageSnapshot([{ id: 1, body: 'a' }], [{ id: 1, body: 'a' }, { id: 2, body: 'x' }])).toBe(false)
  })
})

describe('sameLessonSnapshot', () => {
  const lesson = {
    id: 2,
    status: 'IN_PROGRESS',
    meetingUrl: null,
    teacherId: 9,
    teacherName: 'Ann',
    title: 'B2',
    durationMinutes: 45,
    participants: [{ studentId: 1, studentName: 'Sam' }],
  }

  it('ignores a freshly parsed copy of the same lesson', () => {
    expect(sameLessonSnapshot(lesson, { ...lesson, participants: [...lesson.participants] })).toBe(true)
  })

  it('notices a status or roster change', () => {
    expect(sameLessonSnapshot(lesson, { ...lesson, status: 'PAUSED' })).toBe(false)
    expect(sameLessonSnapshot(lesson, { ...lesson, participants: [] })).toBe(false)
  })
})
