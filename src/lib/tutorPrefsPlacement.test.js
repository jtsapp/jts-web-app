import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { savePlacementLevel } from './tutorPrefs.js'

// Уровень доезжает до роута Neon-профиля, а ответ сервера возвращается целиком — в нём записанный уровень.
describe('savePlacementLevel', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  })
  afterEach(() => vi.restoreAllMocks())

  const bodyOf = () => JSON.parse(global.fetch.mock.calls[0][1].body)

  it('отправляет только уровень и device-id', async () => {
    await savePlacementLevel('TOK', 'A2')

    expect(global.fetch).toHaveBeenCalledWith('/api/placement/complete', expect.anything())
    const body = bodyOf()
    expect(body.level).toBe('A2')
    expect(typeof body.deviceId).toBe('string')
    expect(Object.keys(body).sort()).toEqual(['deviceId', 'level'])
  })

  it('возвращает разобранный ответ сервера — в нём записанный уровень', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, level: 'A1', measured: 'A0' }) })

    await expect(savePlacementLevel('TOK', 'A0')).resolves.toMatchObject({ level: 'A1' })
  })

  it('сеть упала — null, а не исключение', async () => {
    global.fetch.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(savePlacementLevel('TOK', 'B1')).resolves.toBe(null)
  })
})
