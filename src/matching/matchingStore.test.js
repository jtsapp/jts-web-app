import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api.js', () => ({
  getStudentMatching: vi.fn(),
  getMatchingHandoffs: vi.fn(async () => []),
}))
import { getStudentMatching, getMatchingHandoffs } from '../api.js'
import { refreshMatching, getMatchingSnapshot, applyMatchingCard, resetMatchingStore } from './matchingStore.js'

describe('matchingStore', () => {
  beforeEach(() => {
    resetMatchingStore()
    vi.clearAllMocks()
    getMatchingHandoffs.mockResolvedValue([])
  })

  it('keeps the card and pending handoffs of the token', async () => {
    getStudentMatching.mockResolvedValue({ status: 'ready', card: { apiVersion: 2, matchStatus: 'self' } })
    getMatchingHandoffs.mockResolvedValue([{ id: 4, status: 'PENDING' }])
    await refreshMatching('t1')
    const s = getMatchingSnapshot()
    expect(s.status).toBe('ready')
    expect(s.card.matchStatus).toBe('self')
    expect(s.handoffs).toHaveLength(1)
  })

  it('treats an old backend card without apiVersion as unavailable', async () => {
    getStudentMatching.mockResolvedValue({ status: 'ready', card: { matchStatus: 'self' } })
    await refreshMatching('t1')
    expect(getMatchingSnapshot().status).toBe('unavailable')
  })

  it('remembers that the student is not in matching', async () => {
    getStudentMatching.mockResolvedValue({ status: 'not_added' })
    await refreshMatching('t1')
    expect(getMatchingSnapshot().status).toBe('not_added')
  })

  it('does not let a late answer for an old token overwrite the new one', async () => {
    let release
    getStudentMatching.mockImplementationOnce(() => new Promise((r) => { release = r }))
    const old = refreshMatching('old')
    getStudentMatching.mockResolvedValueOnce({ status: 'not_added' })
    await refreshMatching('new')
    release({ status: 'ready', card: { apiVersion: 2, matchStatus: 'done' } })
    await old
    expect(getMatchingSnapshot()).toMatchObject({ token: 'new', status: 'not_added' })
  })

  it('applies a card returned by an action without a new request', () => {
    applyMatchingCard({ apiVersion: 2, matchStatus: 'sent' })
    expect(getMatchingSnapshot().card.matchStatus).toBe('sent')
    expect(getStudentMatching).not.toHaveBeenCalled()
  })
})
