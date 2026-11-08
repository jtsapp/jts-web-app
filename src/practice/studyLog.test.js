// Журнал ответов вкладки для модели ученика: только со входом, пример ошибки досылается, пачка уходит одним запросом,
// сбой возвращает её в очередь — но не другому ученику.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ token: null, uid: null }))
vi.mock('../lib/session.js', () => ({ loadToken: () => auth.token }))
vi.mock('../lib/jwt.js', () => ({ userIdFromToken: () => auth.uid }))

const { _studyQueue, attachStudyExample, clearStudyLog, flushStudy, recordStudy } = await import('./studyLog.js')

const fetchMock = vi.fn()
beforeEach(() => {
  clearStudyLog()
  auth.token = 'tok'
  auth.uid = 7
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('studyLog', () => {
  it('гостю ничего не копится', () => {
    auth.token = null
    recordStudy({ source: 'ggame', item: 'ggame:L2-03', ok: true })
    expect(_studyQueue()).toEqual([])
  })

  it('пауза с прошлого ответа считается сама; пример ошибки досылается к последней ошибке темы', () => {
    recordStudy({ source: 'ggame', item: 'ggame:L2-03', ok: true })
    recordStudy({ source: 'ggame', item: 'ggame:L2-03', ok: false })
    attachStudyExample('ggame:L2-03', 'She ___ (go). → went')
    const q = _studyQueue()
    expect(q[0].gap).toBeNull()
    expect(q[1]).toMatchObject({ ok: false, example: 'She ___ (go). → went', gap: expect.any(Number) })
  })

  it('пачка — одним POST; сбой сервера возвращает её в очередь', async () => {
    recordStudy({ source: 'ggame', item: 'ggame:L2-03', ok: true })
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }))
    flushStudy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/study/answers')
    expect(JSON.parse(init.body).answers).toHaveLength(1)
    expect(_studyQueue()).toHaveLength(0)
    await vi.waitFor(() => expect(_studyQueue()).toHaveLength(1))
  })

  it('вошёл другой ученик — ответы прежнего не уходят под его токеном', () => {
    recordStudy({ source: 'ggame', item: 'ggame:L2-03', ok: true })
    auth.uid = 8
    flushStudy()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(_studyQueue()).toEqual([])
  })
})
