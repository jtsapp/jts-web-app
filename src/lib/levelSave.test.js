import { describe, it, expect, vi, beforeEach } from 'vitest'

const saveLanguageLevel = vi.fn()
const getLanguageLevel = vi.fn()
const savePlacementLevel = vi.fn()

vi.mock('../api.js', () => ({
  saveLanguageLevel: (...a) => saveLanguageLevel(...a),
  getLanguageLevel: (...a) => getLanguageLevel(...a),
}))
vi.mock('./tutorPrefs.js', () => ({
  savePlacementLevel: (...a) => savePlacementLevel(...a),
}))

import { persistPlacementLevel } from './levelSave.js'

const noSleep = { sleep: async () => {} }

describe('persistPlacementLevel', () => {
  beforeEach(() => {
    saveLanguageLevel.mockReset().mockResolvedValue({})
    getLanguageLevel.mockReset().mockResolvedValue('B1')
    savePlacementLevel.mockReset().mockResolvedValue(null)
  })

  it('пишет уровень и подтверждает его чтением с бэкенда', async () => {
    const res = await persistPlacementLevel('TOK', 'B1', noSleep)

    expect(res.ok).toBe(true)
    expect(saveLanguageLevel).toHaveBeenCalledWith('TOK', 'B1')
    // 2xx сам по себе ничего не доказывает — уровень перечитывается.
    expect(getLanguageLevel).toHaveBeenCalledWith('TOK')
    expect(savePlacementLevel).toHaveBeenCalledWith('TOK', 'B1', undefined, undefined)
  })

  it('уровень берётся от сервера, а не от клиента', async () => {
    // Сервер пересчитал журнал и вернул свой вердикт — записываем его.
    savePlacementLevel.mockResolvedValue({ level: 'A1', measured: 'A0' })
    getLanguageLevel.mockResolvedValue('A1')

    const res = await persistPlacementLevel('TOK', 'C2', { ...noSleep, session: { log: [] } })

    expect(res).toMatchObject({ ok: true, level: 'A1' })
    expect(saveLanguageLevel).toHaveBeenCalledWith('TOK', 'A1')
  })

  it('журнал прохождения уезжает на сервер', async () => {
    const session = { log: [{ id: 'rt-a2-01', optIndex: 1 }] }

    await persistPlacementLevel('TOK', 'B1', { ...noSleep, session })

    expect(savePlacementLevel).toHaveBeenCalledWith('TOK', 'B1', undefined, session)
  })

  it('сервер молчит о уровне — остаётся клиентский', async () => {
    savePlacementLevel.mockResolvedValue(null) // 503: DATABASE_URL не задан

    const res = await persistPlacementLevel('TOK', 'B1', noSleep)

    expect(res.level).toBe('B1')
    expect(saveLanguageLevel).toHaveBeenCalledWith('TOK', 'B1')
  })

  it('повторяет попытку, когда запись сорвалась', async () => {
    saveLanguageLevel
      .mockRejectedValueOnce(new Error('Нет связи с сервером при сохранении уровня.'))
      .mockResolvedValue({})

    const res = await persistPlacementLevel('TOK', 'B1', noSleep)

    expect(res.ok).toBe(true)
    expect(saveLanguageLevel).toHaveBeenCalledTimes(2)
  })

  it('повторяет, когда бэкенд подтвердил не тот уровень', async () => {
    getLanguageLevel.mockResolvedValue('A1')

    const res = await persistPlacementLevel('TOK', 'B1', noSleep)

    expect(res.ok).toBe(false)
    expect(res.error.message).toContain('A1')
    expect(saveLanguageLevel).toHaveBeenCalledTimes(3)
  })

  it('сдаётся после всех попыток и возвращает ошибку — чтобы её показали', async () => {
    const boom = new Error('Нет связи с сервером при сохранении уровня.')
    saveLanguageLevel.mockRejectedValue(boom)

    const res = await persistPlacementLevel('TOK', 'B1', noSleep)

    expect(res.ok).toBe(false)
    expect(res.error).toBe(boom)
    expect(saveLanguageLevel).toHaveBeenCalledTimes(3)
  })

  it('пустой уровень не пишется никуда', async () => {
    const res = await persistPlacementLevel('TOK', null, noSleep)

    expect(res.ok).toBe(false)
    expect(savePlacementLevel).not.toHaveBeenCalled()
    expect(saveLanguageLevel).not.toHaveBeenCalled()
  })

  it('анонимный прогон: пишем только в Neon-профиль и не считаем это ошибкой', async () => {
    const res = await persistPlacementLevel(null, 'A2', noSleep)

    expect(res).toEqual({ ok: true, anonymous: true, level: 'A2' })
    expect(savePlacementLevel).toHaveBeenCalledWith(null, 'A2', undefined, undefined)
    expect(saveLanguageLevel).not.toHaveBeenCalled()
  })
})
