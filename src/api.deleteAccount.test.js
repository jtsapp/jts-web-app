// @vitest-environment jsdom
// Удаление своего аккаунта (App Store): DELETE /user/me с токеном, а отказ несёт код — экран по нему отличает
// аккаунт сотрудника (403), стенд без ручки (404) и обрыв связи (0).
import { describe, it, expect, vi } from 'vitest'

vi.mock('./lib/session.js', () => ({ reportUnauthorized: vi.fn() }))

import { deleteMyAccount } from './api.js'
import { reportUnauthorized } from './lib/session.js'

function answerWith(status, body = {}) {
  globalThis.fetch = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }))
}

describe('deleteMyAccount', () => {
  it('DELETE /user/me с Bearer', async () => {
    answerWith(200, { success: true })
    await expect(deleteMyAccount('t-ok')).resolves.toEqual({ success: true })
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/user\/me$/)
    expect(opts.method).toBe('DELETE')
    expect(opts.headers.Authorization).toBe('Bearer t-ok')
  })

  it('отказ сервера несёт код', async () => {
    answerWith(403, { messages: ['Staff accounts are removed by an administrator'] })
    await expect(deleteMyAccount('t-staff')).rejects.toMatchObject({ status: 403 })
    answerWith(404)
    await expect(deleteMyAccount('t-old')).rejects.toMatchObject({ status: 404 })
  })

  it('обрыв сети — код 0', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(deleteMyAccount('t-net')).rejects.toMatchObject({ status: 0 })
  })

  it('401 отдаётся разбору сессии, как у остальных ручек', async () => {
    answerWith(401)
    await expect(deleteMyAccount('t-old-session')).rejects.toMatchObject({ status: 401 })
    expect(reportUnauthorized).toHaveBeenCalledWith('t-old-session')
  })
})
