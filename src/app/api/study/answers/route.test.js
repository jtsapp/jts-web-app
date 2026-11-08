import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /api/study/answers: только вошедший ученик, только очищенные ответы, сбой базы — 500 без падения.
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => true }))
vi.mock('@/lib/auth-server.js', () => ({ resolveProfileId: vi.fn(async () => ({ id: 'user-7' })) }))
vi.mock('@/lib/db/studentModel.js', () => ({ recordAnswers: vi.fn(async (_id, a) => ({ saved: a.length, items: 1 })) }))

const { POST } = await import('./route.js')
const { recordAnswers } = await import('@/lib/db/studentModel.js')
const { resolveProfileId } = await import('@/lib/auth-server.js')

const req = (body, auth = 'Bearer tok') =>
  new Request('http://localhost/api/study/answers', {
    method: 'POST',
    headers: { ...(auth ? { authorization: auth } : {}), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /api/study/answers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('без входа — 401', async () => {
    expect((await POST(req({ answers: [] }, null))).status).toBe(401)
  })

  it('пишет только годные ответы', async () => {
    const res = await POST(req({ answers: [{ source: 'ggame', item: 'ggame:L2-03', ok: false, example: 'q → a' }, { source: 'x' }] }))
    expect(res.status).toBe(200)
    expect(recordAnswers).toHaveBeenCalledWith('user-7', [expect.objectContaining({ item: 'ggame:L2-03', example: 'q → a' })])
  })

  it('ни одного годного — 400; профиль гостя — 401', async () => {
    expect((await POST(req({ answers: [{ source: 'x' }] }))).status).toBe(400)
    resolveProfileId.mockResolvedValueOnce({ id: 'dev-abc' })
    expect((await POST(req({ answers: [{ source: 'ggame', item: 'ggame:L2-03', ok: true }] }))).status).toBe(401)
  })

  it('сбой базы — 500', async () => {
    recordAnswers.mockRejectedValueOnce(new Error('relation "study_answer" does not exist'))
    expect((await POST(req({ answers: [{ source: 'ggame', item: 'ggame:L2-03', ok: true }] }))).status).toBe(500)
  })
})
