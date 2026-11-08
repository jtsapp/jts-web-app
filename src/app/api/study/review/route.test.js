import { describe, expect, it, vi } from 'vitest'

// GET /api/study/review: слова к повторению с переводом из строки вещи — блок «Повторить по расписанию» «Словаря».
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => true }))
vi.mock('@/lib/auth-server.js', () => ({ resolveProfileId: vi.fn(async () => ({ id: 'user-7' })) }))
vi.mock('@/lib/db/studentModel.js', () => ({
  loadDueWords: vi.fn(async () => [
    { item: 'word:decide', title: 'decide', extra: { ru: 'решать', example: 'I {{decide}} today.' } },
    { item: 'word:broken', title: null, extra: null },
  ]),
}))

const { GET } = await import('./route.js')

describe('GET /api/study/review', () => {
  it('без входа — 401', async () => {
    expect((await GET(new Request('http://localhost/api/study/review'))).status).toBe(401)
  })

  it('слова с переводом; без слова — мимо', async () => {
    const res = await GET(new Request('http://localhost/api/study/review', { headers: { authorization: 'Bearer tok' } }))
    expect(await res.json()).toEqual({ words: [{ key: 'decide', en: 'decide', ru: 'решать', kk: '', example: 'I {{decide}} today.' }] })
  })
})
