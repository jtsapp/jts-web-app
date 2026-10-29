import { beforeEach, describe, it, expect, vi } from 'vitest'
import { getPendingLessonFeedback, submitLessonFeedback } from './api.js'
beforeEach(() => { global.fetch = vi.fn() })
describe('API опроса после урока', () => {
  it('204 означает отсутствие опроса', async () => {
    fetch.mockResolvedValue({ ok: true, status: 204 })
    await expect(getPendingLessonFeedback('t')).resolves.toBeNull()
    expect(fetch.mock.calls[0][0]).toContain('/mobile/lesson-feedback/pending')
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer t')
  })
  it('ответы отправляются для выбранного урока с токеном', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await submitLessonFeedback('t', 17, { lessonRating: 4, teacherRating: 5, connectionQuality: 'AVERAGE' })
    const [url, options] = fetch.mock.calls[0]
    expect(url).toContain('/mobile/lesson-feedback/17')
    expect(options.headers.Authorization).toBe('Bearer t')
    expect(JSON.parse(options.body).teacherRating).toBe(5)
  })
})
