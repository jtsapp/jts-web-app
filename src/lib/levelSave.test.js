import { describe, it, expect, vi, beforeEach } from 'vitest'

const saveLanguageLevel = vi.fn()
const getLanguageLevel = vi.fn()
const savePlacementLevel = vi.fn()
const saveTutorPrefs = vi.fn()

vi.mock('../api.js', () => ({
  saveLanguageLevel: (...a) => saveLanguageLevel(...a),
  getLanguageLevel: (...a) => getLanguageLevel(...a),
}))
vi.mock('./tutorPrefs.js', () => ({
  savePlacementLevel: (...a) => savePlacementLevel(...a),
  saveTutorPrefs: (...a) => saveTutorPrefs(...a),
}))

import { persistPlacementLevel, syncProfileLevel } from './levelSave.js'

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
    expect(savePlacementLevel).toHaveBeenCalledWith('TOK', 'B1', undefined, undefined, undefined)
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

    expect(savePlacementLevel).toHaveBeenCalledWith('TOK', 'B1', undefined, session, undefined)
  })

  it('токен прогона уезжает вместе с уровнем', async () => {
    // По записи прогона сервер и считает итог: журнал клиента — запасной путь.
    await persistPlacementLevel('TOK', 'B1', { ...noSleep, sessionToken: 'run-1' })

    expect(savePlacementLevel).toHaveBeenCalledWith('TOK', 'B1', undefined, undefined, 'run-1')
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
    expect(savePlacementLevel).toHaveBeenCalledWith(null, 'A2', undefined, undefined, undefined)
    expect(saveLanguageLevel).not.toHaveBeenCalled()
  })
})

describe('syncProfileLevel', () => {
  beforeEach(() => {
    saveTutorPrefs.mockReset().mockResolvedValue(null)
  })

  it('переносит уровень бэкенда в свой профиль — иначе тьютор не узнает о правке', () => {
    // Менеджер исправил ученику уровень в админке: бэкенд знает B1, а копия
    // этого приложения (её читает голосовой тьютор) осталась с уровнем теста.
    syncProfileLevel('TOK', 'B1')

    expect(saveTutorPrefs).toHaveBeenCalledWith('TOK', { level: 'B1' })
  })

  it('A0 не уезжает в профиль: у агента для него нет методички', () => {
    // cefr_guidance_for отдаёт на неизвестный уровень указания B1 — новичок
    // получил бы тьютора, говорящего с ним на B1. То же правило, что и у
    // записи результата теста (profileLevel).
    syncProfileLevel('TOK', 'A0')

    expect(saveTutorPrefs).toHaveBeenCalledWith('TOK', { level: 'A1' })
  })

  it('без токена или без уровня не трогает профиль', () => {
    // Аноним: бэкенд-профиля у него нет, переносить нечего. Пустой уровень —
    // тест не пройден, и записать null значило бы стереть то, что уже есть.
    syncProfileLevel(null, 'B1')
    syncProfileLevel('TOK', null)

    expect(saveTutorPrefs).not.toHaveBeenCalled()
  })
})
