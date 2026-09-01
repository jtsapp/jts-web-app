import { describe, it, expect } from 'vitest'
import { GET, OPTIONS } from './route.js'

// Каталог отдаётся панели преподавателя — там его единственный потребитель.
describe('GET /api/practice/catalog', () => {
  it('отдаёт уровни со списком юнитов', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    const grammar = body.areas.find((a) => a.key === 'grammar')
    expect(grammar).toBeTruthy()
    expect(grammar.levels.map((l) => l.code)).toEqual(['a0', 'a1', 'a2', 'b1', 'b2', 'c1'])

    const a1 = grammar.levels.find((l) => l.code === 'a1')
    expect(a1.units.length).toBeGreaterThan(0)
    expect(a1.units[0]).toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
      section: expect.any(String),
    })
  })

  // Названия в каталоге размечены (<em>…</em>) — в списке выбора нужен голый текст.
  it('в названиях юнитов нет разметки', async () => {
    const body = await (await GET()).json()
    const titles = body.areas[0].levels.flatMap((l) => l.units.map((u) => u.title))
    expect(titles.some((t) => t.includes('<'))).toBe(false)
  })

  // Запрос идёт с домена админки — без этих заголовков браузер его отклонит.
  it('отвечает с заголовками CORS', async () => {
    const res = await GET()
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(OPTIONS().status).toBe(204)
  })
})
