import { describe, it, expect } from 'vitest'
import { GET, OPTIONS } from './route.js'

const get = (level, unit) => GET(new Request(`http://x/api/practice/grammar/${level}/${unit}`), {
  params: Promise.resolve({ level, unit }),
})

// Упражнения юнита забирает конструктор уроков панели преподавателя.
describe('GET /api/practice/grammar/[level]/[unit]', () => {
  it('отдаёт упражнения юнита без теории, название — без разметки', async () => {
    const res = await get('a1', '1')
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body).toMatchObject({ level: 'a1', unitId: 1, title: 'am / is / are', section: 'Present' })
    expect(body.activities.length).toBeGreaterThan(0)
    expect(body.activities[0]).toHaveProperty('type')
    expect(body).not.toHaveProperty('learn')
    expect(body).not.toHaveProperty('learnTr')
  })

  it('разрешает запрос с домена админки', async () => {
    const res = await get('a1', '1')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(OPTIONS().status).toBe(204)
    expect(OPTIONS().headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it.each([
    ['уровня нет', 'z9', '1'],
    ['юнита нет', 'a1', '99999'],
    ['адрес уровня — путь', '..', '1'],
    ['номер не число', 'a1', '1x'],
  ])('404, когда %s', async (_, level, unit) => {
    const res = await get(level, unit)
    expect(res.status).toBe(404)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
