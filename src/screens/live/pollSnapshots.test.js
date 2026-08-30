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

  // Шапку живого урока рисует groupName/topic, вкладку «Группа» — тип занятия и
  // статусы участников. Пока эти поля не сравнивались, поллинг отбрасывал
  // свежий ответ: преподаватель прикреплял материал, а у ученика шапка до конца
  // урока показывала запасное «Живой урок».
  it('замечает поля, которыми живёт шапка урока', () => {
    expect(sameLessonSnapshot(lesson, { ...lesson, topic: 'Present Perfect' })).toBe(false)
    expect(sameLessonSnapshot(lesson, { ...lesson, groupName: 'Группа IELTS' })).toBe(false)
    expect(sameLessonSnapshot(lesson, { ...lesson, lessonType: 'GROUP' })).toBe(false)
  })

  it('замечает отмену участника, а не только его уход из списка', () => {
    const cancelled = { ...lesson, participants: [{ studentId: 1, studentName: 'Sam', status: 'CANCELLED_FREE' }] }
    expect(sameLessonSnapshot(lesson, cancelled)).toBe(false)
  })
})
