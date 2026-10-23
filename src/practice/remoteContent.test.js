import { describe, it, expect, vi } from 'vitest'
import { loadPracticeContent } from './remoteContent.js'

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const status = (code) => ({ ok: false, status: code, json: async () => ({}) })
const STATIC = [{ id: 'a1_001', from: 'static' }]
const REMOTE = [{ id: 'a1_001', from: 'api' }]

function fetchWith(remote) {
  return vi.fn(async (url) => {
    if (String(url).startsWith('https://api.test/')) {
      if (remote instanceof Error) throw remote
      return remote
    }
    if (url === '/practice/listening/content/a1.json') return ok(STATIC)
    return status(404)
  })
}

const load = (fetchImpl, staticUrl = '/practice/listening/content/a1.json') =>
  loadPracticeContent('listening', 'a1', staticUrl, { fetchImpl, base: 'https://api.test', timeoutMs: 50 })

describe('loadPracticeContent', () => {
  it('бэкенд ответил заданиями — берём их', async () => {
    const f = fetchWith(ok(REMOTE))
    expect(await load(f)).toEqual({ data: REMOTE, source: 'api' })
    expect(f).toHaveBeenCalledTimes(1)
    expect(f.mock.calls[0][0]).toBe('https://api.test/practice-content/listening/a1')
  })

  it.each([
    ['404', status(404)],
    ['5xx', status(502)],
    ['пустой список (на стенде ещё не залили)', ok([])],
    ['не массив', ok({ ok: true })],
    ['ошибка сети', new Error('offline')],
  ])('%s — статика', async (_name, remote) => {
    expect(await load(fetchWith(remote))).toEqual({ data: STATIC, source: 'static' })
  })

  it('бэкенд завис — по таймауту статика', async () => {
    const f = vi.fn((url, init) => {
      if (String(url).startsWith('https://api.test/')) {
        return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
      }
      return Promise.resolve(ok(STATIC))
    })
    expect((await load(f)).source).toBe('static')
  })

  it('статика тоже не ответила — ошибка (экран покажет «не удалось загрузить»)', async () => {
    const f = vi.fn(async () => status(404))
    await expect(load(f)).rejects.toThrow()
  })

  it('без запасного пути (после чистки раздела) — неудача бэкенда это ошибка', async () => {
    await expect(load(fetchWith(status(404)), null)).rejects.toThrow(/practice content unavailable/)
  })
})
