import { describe, it, expect } from 'vitest'
import { matchingView, popupFor, needsTeacherPick } from './matchingState.js'

const now = new Date('2026-10-26T10:00:00Z')
const base = {
  apiVersion: 2, studentId: 7, matchStatus: 'self', tariff: 'General', lessonDuration: 60, lessonsPerWeek: 2,
  guarantee: false, tariffConfirmed: true, requests: [], availableSlots: [], interests: [],
  proposedSlots: [], finalSlots: [], teacherChangesLeft: 2,
}
const view = (card, extra = {}) =>
  matchingView({ status: 'ready', card: { ...base, ...card }, handoffs: [], ...extra }, now)

describe('matchingView', () => {
  it('maps store states without a card', () => {
    expect(matchingView({ status: 'not_added' }).status).toBe('no_subscription')
    expect(matchingView({ status: 'unavailable' }).status).toBe('unavailable')
    expect(matchingView({ status: 'loading' }).status).toBe('loading')
  })

  it('tariff pending vs manager asked before the tariff was confirmed', () => {
    expect(view({ matchStatus: 'tariff', tariffConfirmed: false }).status).toBe('tariff_pending')
    expect(view({ matchStatus: 'tariff', tariffConfirmed: false, askedAt: '2026-10-26T12:00:00' }).status)
      .toBe('manager_picking')
    expect(view({ matchStatus: 'ask' }).status).toBe('manager_picking')
  })

  it('self and recoverable help are "none" with a badge', () => {
    expect(view({ matchStatus: 'self' })).toMatchObject({ status: 'none', badge: 1 })
    expect(view({ matchStatus: 'help', reasonCode: 'all_declined' })).toMatchObject({ status: 'none', allDeclined: true })
    expect(view({ matchStatus: 'help', reasonCode: 'choose_timeout' }).status).toBe('none')
    expect(view({ matchStatus: 'help', reasonCode: 'no_candidates' }).status).toBe('none')
    expect(view({ matchStatus: 'tariff', tariffConfirmed: false }).badge).toBe(0)
  })

  it('sent → matching with per-teacher statuses by priority', () => {
    const v = view({
      matchStatus: 'sent',
      requests: [
        { id: 2, teacherId: 4, teacherName: 'Данияр', priority: 2, status: 'declined', source: 'student' },
        { id: 1, teacherId: 3, teacherName: 'Айгерим', priority: 1, status: 'sent', source: 'student', expiresAt: '2026-10-26T22:00:00' },
      ],
    })
    expect(v.status).toBe('matching')
    expect(v.requests.map((r) => [r.priority, r.state])).toEqual([[1, 'waiting'], [2, 'declined']])
    expect(v.badge).toBe(0)
  })

  it('confirm → schedule_proposed by manager or teacher; live counter → change_requested', () => {
    const proposal = {
      matchStatus: 'confirm', assignedTeacherId: 3, assignedTeacherName: 'Айгерим', deadline: '2026-10-27T15:00:00',
      proposedSlots: [{ weekday: 1, start: '14:00:00' }],
      requests: [{ id: 5, teacherId: 3, status: 'schedule_proposed', source: 'manager_proposal',
        availableSlots: [{ weekday: 1, start: '14:00:00' }, { weekday: 3, start: '14:00:00' }] }],
    }
    const v = view(proposal)
    expect(v).toMatchObject({ status: 'schedule_proposed', badge: 1 })
    expect(v.proposal).toMatchObject({ by: 'manager', teacherId: 3, teacherName: 'Айгерим' })
    expect(v.proposal.commonSlots).toHaveLength(2)
    expect(view({ ...proposal, requests: [{ ...proposal.requests[0], source: 'student' }] }).proposal.by).toBe('teacher')
    const c = view({
      ...proposal,
      requests: [...proposal.requests, { id: 6, teacherId: 3, status: 'sent', source: 'student_counter',
        expiresAt: '2026-10-26T22:00:00', proposedSlots: [{ weekday: 4, start: '14:00:00' }] }],
    })
    expect(c.status).toBe('change_requested')
    expect(c.counter.expiresAt).toBe('2026-10-26T22:00:00')
    expect(c.badge).toBe(0)
  })

  it('expired confirmation keeps the last proposed teacher', () => {
    const v = view({
      matchStatus: 'help', reasonCode: 'confirm_expired', proposedSlots: [{ weekday: 1, start: '14:00:00' }],
      requests: [{ id: 5, teacherId: 3, teacherName: 'Айгерим', status: 'cancelled', source: 'student',
        proposedSlots: [{ weekday: 1, start: '14:00:00' }] }],
    })
    expect(v).toMatchObject({ status: 'confirm_expired', badge: 1 })
    expect(v.proposal.teacherName).toBe('Айгерим')
  })

  it('assigned, change pending and the vacation badge', () => {
    expect(view({ matchStatus: 'done', assignedTeacherId: 3 }).status).toBe('assigned')
    expect(view({ matchStatus: 'change', assignedTeacherId: 3 }).status).toBe('change_pending')
    const v = view({ matchStatus: 'done', assignedTeacherId: 3 }, {
      handoffs: [{ id: 9, teacherName: 'Айгерим', dateFrom: '2026-11-02', dateTo: '2026-11-15', studentChoice: null }],
    })
    expect(v.vacation).toMatchObject({ id: 9, from: '2026-11-02', to: '2026-11-15' })
    expect(v.badge).toBe(1)
    const paused = view({ matchStatus: 'done', assignedTeacherId: 3 }, {
      handoffs: [{ id: 9, dateFrom: '2026-11-02', dateTo: '2026-11-15', studentChoice: 'pause' }],
    })
    expect(paused.vacation).toBeNull()
    expect(paused.paused).toEqual({ from: '2026-11-02', to: '2026-11-15' })
  })

  it('temporary teacher only inside the period', () => {
    const inside = view({ matchStatus: 'done', assignedTeacherName: 'Сара', temporaryFrom: '2026-10-20', temporaryTo: '2026-10-30' })
    expect(inside.temporary).toMatchObject({ teacherName: 'Сара', to: '2026-10-30' })
    expect(view({ matchStatus: 'done', temporaryFrom: '2026-11-02', temporaryTo: '2026-11-15' }).temporary).toBeNull()
  })

  it('a format-change lock that already passed is no lock', () => {
    expect(view({ matchStatus: 'done', formatChangeAvailableAt: '2026-11-20T10:00:00' }).limits.formatChangeAvailableAt).toBe('2026-11-20T10:00:00')
    expect(view({ matchStatus: 'done', formatChangeAvailableAt: '2026-10-01T10:00:00' }).limits.formatChangeAvailableAt).toBeNull()
  })

  it('format step is skipped for guarantee, IELTS and SAT', () => {
    expect(view({}).needsFormatStep).toBe(true)
    expect(view({ guarantee: true }).needsFormatStep).toBe(false)
    expect(view({ tariff: 'IELTS' }).needsFormatStep).toBe(false)
    expect(view({ tariff: 'SAT' }).needsFormatStep).toBe(false)
  })

  it('approved change shows up as an exclusion while choosing again', () => {
    expect(view({ matchStatus: 'self', excludedTeacherId: 3, change: { id: 4, status: 'approve_self' } }).changeApproved)
      .toBe(true)
  })
})

describe('popupFor', () => {
  it('one key per event', () => {
    const v = view({ matchStatus: 'confirm', deadline: '2026-10-27T15:00:00', proposedSlots: [], requests: [] })
    expect(popupFor(v)).toEqual({ kind: 'proposal', key: 'proposal:2026-10-27T15:00:00' })
    expect(popupFor(view({ matchStatus: 'self' }))).toBeNull()
    expect(popupFor(view({ matchStatus: 'help', reasonCode: 'all_declined',
      requests: [{ id: 1, priority: 1, status: 'declined', source: 'student' }] })))
      .toEqual({ kind: 'all_declined', key: 'declined:1' })
    expect(popupFor(view({ matchStatus: 'done' }, { handoffs: [{ id: 9, studentChoice: null }] })))
      .toEqual({ kind: 'vacation', key: 'vacation:9' })
  })
})

describe('needsTeacherPick', () => {
  it('only before a teacher exists', () => {
    expect(needsTeacherPick(view({ matchStatus: 'self' }))).toBe(true)
    expect(needsTeacherPick(view({ matchStatus: 'tariff', tariffConfirmed: false }))).toBe(true)
    expect(needsTeacherPick(view({ matchStatus: 'sent' }))).toBe(false)
    expect(needsTeacherPick(matchingView({ status: 'unavailable' }))).toBe(false)
  })
})
