import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Разбор сессии на 401 — чужая забота (lib/session.js); здесь важно только, что его позвали.
vi.mock('../lib/session.js', () => ({ reportUnauthorized: vi.fn() }))

import { reportUnauthorized } from '../lib/session.js'
import { API_BASE } from '../lib/apiBase.js'
import {
  BirgeApiError,
  getBirgeThread,
  isSectionMissing,
  listBirgePosts,
  publishBirgePost,
  reportBirgePost,
  setBirgeLike,
  uploadBirgeMedia,
} from './birgeApi.js'

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
let fetchMock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('клиент Birge (/mobile/birge/**)', () => {
  it('лента без фильтра — /posts с токеном; тема и курсор — параметрами', async () => {
    fetchMock.mockResolvedValue(reply(200, { items: [{ id: 1 }], nextCursor: '2026-11-11T09:40:00+05:00,101' }))
    await expect(listBirgePosts('T')).resolves.toEqual({ items: [{ id: 1 }], nextCursor: '2026-11-11T09:40:00+05:00,101' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE}/mobile/birge/posts`)
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe('Bearer T')

    fetchMock.mockResolvedValue(reply(200, { items: [], nextCursor: null }))
    await expect(listBirgePosts('T', { topic: 'GRAMMAR', cursor: '2026-11-11T09:40:00+05:00,101' })).resolves.toEqual({
      items: [],
      nextCursor: null,
    })
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${API_BASE}/mobile/birge/posts?topic=GRAMMAR&cursor=2026-11-11T09%3A40%3A00%2B05%3A00%2C101`,
    )
  })

  it('кривой ответ ленты не роняет экран: пустой список и конец', async () => {
    fetchMock.mockResolvedValue(reply(200, { items: 'nope', nextCursor: '' }))
    await expect(listBirgePosts('T')).resolves.toEqual({ items: [], nextCursor: null })
  })

  it('ветка — { thread, comments }', async () => {
    fetchMock.mockResolvedValue(reply(200, { thread: { id: 101 }, comments: [{ id: 102 }] }))
    await expect(getBirgeThread('T', 101)).resolves.toEqual({ thread: { id: 101 }, comments: [{ id: 102 }] })
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/mobile/birge/posts/101`)
  })

  it('публикация — JSON-тело как есть', async () => {
    fetchMock.mockResolvedValue(reply(200, { decision: 'published' }))
    const body = { topic: 'QUESTION', text: 'Привет', mediaIds: [7] }
    await publishBirgePost('T', body)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE}/mobile/birge/posts`)
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual(body)
  })

  it('фото — multipart с полем file, свой Content-Type не ставится', async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 7, width: 1600, height: 1200 }))
    await expect(uploadBirgeMedia('T', new Blob(['jpeg'], { type: 'image/jpeg' }))).resolves.toEqual({ id: 7, width: 1600, height: 1200 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE}/mobile/birge/media`)
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get('file').name).toBe('photo.jpg')
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  it('лайк — POST, снять — DELETE; жалоба шлёт { reason }', async () => {
    fetchMock.mockResolvedValue(reply(200, { liked: true, likes: 13 }))
    await setBirgeLike('T', 101, true)
    await setBirgeLike('T', 101, false)
    expect(fetchMock.mock.calls.map(([u, i]) => [u, i.method])).toEqual([
      [`${API_BASE}/mobile/birge/posts/101/like`, 'POST'],
      [`${API_BASE}/mobile/birge/posts/101/like`, 'DELETE'],
    ])
    fetchMock.mockResolvedValue(reply(200, { reports: 1, hidden: false }))
    await expect(reportBirgePost('T', 101)).resolves.toEqual({ reports: 1, hidden: false })
    expect(fetchMock.mock.calls[2][0]).toBe(`${API_BASE}/mobile/birge/posts/101/report`)
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ reason: null })
  })

  it('429 — код RATE_LIMIT, retryAfterSec и текст сервера', async () => {
    fetchMock.mockResolvedValue(reply(429, { error: 'RATE_LIMIT', retryAfterSec: 1200, message: 'Слишком часто' }))
    const err = await publishBirgePost('T', { text: 'x' }).catch((e) => e)
    expect(err).toBeInstanceOf(BirgeApiError)
    expect(err).toMatchObject({ status: 429, code: 'RATE_LIMIT', retryAfterSec: 1200, serverMessage: 'Слишком часто' })
  })

  it('404 ленты — бэкенд без раздела; текст берётся и из messages[]', async () => {
    fetchMock.mockResolvedValue(reply(404, { messages: ['Not found'] }))
    const err = await listBirgePosts('T').catch((e) => e)
    expect(isSectionMissing(err)).toBe(true)
    expect(err.serverMessage).toBe('Not found')
    expect(isSectionMissing(new BirgeApiError(500, null))).toBe(false)
    expect(isSectionMissing(null)).toBe(false)
  })

  it('прочие отказы — тело { messages } как во всём бэкенде: статус и текст, без retryAfterSec', async () => {
    fetchMock.mockResolvedValue(reply(409, { messages: ['Жалоба уже отправлена'] }))
    await expect(reportBirgePost('T', 101)).rejects.toMatchObject({
      status: 409,
      code: null,
      retryAfterSec: null,
      serverMessage: 'Жалоба уже отправлена',
    })
  })

  it('401 отдаёт разбор сессии; нет сети — статус 0', async () => {
    fetchMock.mockResolvedValue(reply(401, null))
    await expect(listBirgePosts('T')).rejects.toMatchObject({ status: 401 })
    expect(reportUnauthorized).toHaveBeenCalledWith('T')
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(listBirgePosts('T')).rejects.toMatchObject({ status: 0, serverMessage: 'Нет связи с сервером.' })
  })
})
