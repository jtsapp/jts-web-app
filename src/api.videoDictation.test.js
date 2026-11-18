// @vitest-environment jsdom
// Slug урока уходит в путь экранированным: пробел и «/» не должны менять адрес ручки.
import { describe, it, expect, vi } from 'vitest'

vi.mock('./lib/session.js', () => ({ reportUnauthorized: vi.fn() }))

import { getVideoDictationLesson } from './api.js'

describe('getVideoDictationLesson', () => {
  it('slug «a b» — путь /mobile/video-dictation/a%20b', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' }))
    await getVideoDictationLesson('tk', 'a b')
    expect(String(fetch.mock.calls[0][0])).toMatch(/\/mobile\/video-dictation\/a%20b$/)
  })
})
