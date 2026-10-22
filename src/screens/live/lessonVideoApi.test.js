import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLessonVideoToken } from '../../api.js'

beforeEach(() => {
  global.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ token: 'jwt', sessionName: 'jts-lesson-49', userName: 'Айгерим', host: true }),
  }))
})

describe('lesson video api', () => {
  it('getLessonVideoToken POSTs /lessons/{id}/video/token with Bearer и возвращает тело', async () => {
    const body = await getLessonVideoToken('tok', 49)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(String(url)).toMatch(/\/lessons\/49\/video\/token$/)
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer tok')
    expect(body).toEqual({ token: 'jwt', sessionName: 'jts-lesson-49', userName: 'Айгерим', host: true })
  })

  it('503 — ошибка со status, по которому экран уходит на ссылку', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }))
    await expect(getLessonVideoToken('tok', 49)).rejects.toMatchObject({ status: 503 })
  })
})
