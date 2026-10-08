import { describe, it, expect, vi, beforeEach } from 'vitest'

// Тест про контракт роута: что уходит в БД и что возвращается клиенту. БД и
// проверка токена замоканы — их правила проверяются своими тестами.
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => true }))
const store = vi.hoisted(() => ({ saved: [], state: {} }))
vi.mock('@/lib/db/practice.js', () => ({
  loadPracticeState: vi.fn(async () => store.state),
  savePracticeState: vi.fn(async (id, module, state) => {
    store.saved.push({ id, module, state })
    return { merged: true, module }
  }),
}))
vi.mock('@/lib/auth-server.js', () => ({ resolveProfileId: async () => ({ id: 'user-1' }) }))

const { GET, POST } = await import('./route.js')

const auth = { authorization: 'Bearer t' }
const post = (body) =>
  POST(
    new Request('http://x/api/practice/state', {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

beforeEach(() => {
  store.saved = []
  store.state = { vocab: {}, reading: { texts: { t1: { ex: {}, done: true } } }, grammar: { done: [] } }
})

describe('POST /api/practice/state', () => {
  it('reading: чистит вход и отвечает слитым состоянием', async () => {
    const res = await post({ module: 'reading', state: { texts: { t1: { ex: { 0: { score: 1, total: 2 } } } }, junk: 1 } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: true, ok: true, state: { merged: true, module: 'reading' } })
    expect(store.saved[0].state).toEqual({ texts: { t1: { ex: { 0: { score: 1, total: 2 } }, done: false } } })
  })

  it('reading: кривая форма — 400, в БД ничего', async () => {
    const res = await post({ module: 'reading', state: { texts: { t1: { ex: { 0: { score: 9, total: 2 } } } } } })
    expect(res.status).toBe(400)
    expect(store.saved).toEqual([])
  })

  it('прочие модули уходят как есть', async () => {
    const res = await post({ module: 'vocab', state: { a: 1 } })
    expect(res.status).toBe(200)
    expect(store.saved[0]).toEqual({ id: 'user-1', module: 'vocab', state: { a: 1 } })
  })
})

describe('GET /api/practice/state', () => {
  it('?module=reading отдаёт только этот модуль', async () => {
    const res = await GET(new Request('http://x/api/practice/state?module=reading', { headers: auth }))
    expect(await res.json()).toEqual({ configured: true, state: { reading: { texts: { t1: { ex: {}, done: true } } } } })
  })

  it('модуля ещё нет в БД — пустое состояние, а не undefined', async () => {
    store.state = { vocab: {} }
    const res = await GET(new Request('http://x/api/practice/state?module=reading', { headers: auth }))
    expect(await res.json()).toEqual({ configured: true, state: { reading: {} } })
  })

  it('неизвестный модуль — 400', async () => {
    const res = await GET(new Request('http://x/api/practice/state?module=nope', { headers: auth }))
    expect(res.status).toBe(400)
  })

  it('без параметра — весь стейт, как раньше', async () => {
    const body = await (await GET(new Request('http://x/api/practice/state', { headers: auth }))).json()
    expect(Object.keys(body.state)).toEqual(['vocab', 'reading', 'grammar'])
  })
})
