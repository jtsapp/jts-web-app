import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMyLessonOccurrences, getLessonsSummary } from '../../api.js'

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => [{ lessonId: 14 }] }))
})

describe('schedule api', () => {
  it('getMyLessonOccurrences GETs /admin/lessons/occurrences with a Bearer token', async () => {
    const data = await getMyLessonOccurrences('TOK')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/occurrences')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(data).toEqual([{ lessonId: 14 }])
  })

  it('getLessonsSummary GETs /admin/lessons/summary with a Bearer token', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ conducted: 0, remaining: 1, cancelled: 0, rescheduled: 0 }) }))
    const data = await getLessonsSummary('TOK')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toContain('/admin/lessons/summary')
    expect(opts.headers.Authorization).toBe('Bearer TOK')
    expect(data.remaining).toBe(1)
  })
})
