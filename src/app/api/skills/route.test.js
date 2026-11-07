import { beforeEach, describe, expect, it, vi } from 'vitest'

// ТЗ v2.0, 5.5: ?level= отдаёт ещё и навыки текущего уровня, а POST пишет разбивку по уровню рядом с общим итогом.
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => true }))
vi.mock('@/lib/auth-server.js', () => ({ resolveProfileId: vi.fn(async () => ({ id: 'user-7' })) }))
vi.mock('@/lib/db/skillStats.js', () => ({
  loadSkillStats: vi.fn(async () => ({ grammar: { done: 40, firstTry: 30 } })),
  loadLevelSkillStats: vi.fn(async () => ({ grammar: { done: 6, firstTry: 3 } })),
  applySkillDeltas: vi.fn(async () => {}),
}))

const { GET, POST } = await import('./route.js')
const { applySkillDeltas, loadLevelSkillStats } = await import('@/lib/db/skillStats.js')

const req = (url, init = {}) => new Request(`http://localhost${url}`, { ...init, headers: { authorization: 'Bearer tok', 'content-type': 'application/json' } })

describe('/api/skills по уровню', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET ?level=b1 — общий итог и навыки уровня; без уровня — как раньше', async () => {
    const withLevel = await (await GET(req('/api/skills?level=b1'))).json()
    expect(loadLevelSkillStats).toHaveBeenCalledWith('user-7', 'B1')
    expect(withLevel).toEqual({ configured: true, stats: { grammar: { done: 40, firstTry: 30 } }, level: 'B1', levelStats: { grammar: { done: 6, firstTry: 3 } } })
    const plain = await (await GET(req('/api/skills?level=IELTS'))).json()
    expect(plain.levelStats).toBeUndefined()
  })

  it('POST с разбивкой по уровню; кривая разбивка не мешает общему итогу', async () => {
    const deltas = { grammar: { done: 2, firstTry: 1 } }
    await POST(req('/api/skills', { method: 'POST', body: JSON.stringify({ deltas, byLevel: { A2: deltas } }) }))
    expect(applySkillDeltas).toHaveBeenLastCalledWith('user-7', deltas, undefined, { A2: deltas })
    const res = await POST(req('/api/skills', { method: 'POST', body: JSON.stringify({ deltas, byLevel: { a2: 'x' } }) }))
    expect(res.status).toBe(200)
    expect(applySkillDeltas).toHaveBeenLastCalledWith('user-7', deltas, undefined, {})
  })
})
