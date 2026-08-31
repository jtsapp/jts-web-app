import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { savePlacementLevel } from './tutorPrefs.js'

// Снимок прохождения (θ, SE, флаги) должен доехать до роута вместе с уровнем —
// иначе спорный результат в профиле неотличим от уверенного.
describe('savePlacementLevel', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  })
  afterEach(() => vi.restoreAllMocks())

  const bodyOf = () => JSON.parse(global.fetch.mock.calls[0][1].body)

  it('кладёт снимок в тело запроса', async () => {
    const summary = { level: 'B1', theta: -0.23, se: 0.61, flags: ['unresolved'] }

    await savePlacementLevel('TOK', 'B1', summary)

    expect(global.fetch).toHaveBeenCalledWith('/api/placement/complete', expect.anything())
    expect(bodyOf()).toMatchObject({ level: 'B1', summary })
  })

  it('журнал прохождения кладётся в тело запроса', async () => {
    const session = { log: [{ id: 'rt-a2-01', optIndex: 1 }], theta0: -1.2 }

    await savePlacementLevel('TOK', 'B1', undefined, session)

    expect(bodyOf()).toMatchObject({ session })
  })

  it('возвращает разобранный ответ сервера — в нём его вердикт', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, level: 'A1', measured: 'A0' }) })

    await expect(savePlacementLevel('TOK', 'A0')).resolves.toMatchObject({ level: 'A1' })
  })

  it('без снимка отправляет только уровень', async () => {
    await savePlacementLevel('TOK', 'A2')

    const body = bodyOf()
    expect(body.level).toBe('A2')
    expect('summary' in body).toBe(false)
  })
})
