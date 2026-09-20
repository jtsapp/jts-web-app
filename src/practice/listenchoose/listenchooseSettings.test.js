// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LISTENCHOOSE_RUN_KEY } from '../practiceKeys.js'
import { DEFAULT_DEVICE, isDeviceStorageBroken, normalizeDevice, readDevice, writeDevice } from './listenchooseSettings.js'

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('normalizeDevice', () => {
  it('пусто и мусор приводятся к умолчаниям', () => {
    expect(normalizeDevice(null)).toEqual(DEFAULT_DEVICE)
    expect(normalizeDevice('x')).toEqual(DEFAULT_DEVICE)
    expect(normalizeDevice([])).toEqual(DEFAULT_DEVICE)
    expect(normalizeDevice({ level: 'expert', rate: 3, volume: 'loud', counts: 5, runs: [] })).toEqual(DEFAULT_DEVICE)
  })

  it('границы прототипа: размер набора целый 1–50, темп из трёх, громкость 0–1', () => {
    const n = normalizeDevice({
      level: 'hard',
      counts: { easy: 0, medium: 51, hard: 30.5 },
      rate: 0.75,
      volume: 7,
    })
    expect(n).toMatchObject({ level: 'hard', rate: 0.75, volume: 1, counts: { easy: 10, medium: 10, hard: 10 } })
    expect(normalizeDevice({ counts: { easy: 1, medium: 50, hard: 20 }, volume: -2 })).toMatchObject({
      counts: { easy: 1, medium: 50, hard: 20 },
      volume: 0,
    })
  })

  it('наборы сохраняются только для известных сложностей и только объектами', () => {
    const run = { queue: ['a'], index: 0, rounds: {}, complete: false }
    const n = normalizeDevice({ runs: { easy: run, medium: 'x', hard: [], expert: run } })
    expect(n.runs).toEqual({ easy: run })
  })
})

describe('чтение и запись', () => {
  it('без записи — умолчания, битый JSON — тоже', () => {
    expect(readDevice()).toEqual(DEFAULT_DEVICE)
    localStorage.setItem(LISTENCHOOSE_RUN_KEY, '{не json')
    expect(readDevice()).toEqual(DEFAULT_DEVICE)
  })

  it('writeDevice сливает патч с сохранённым и переживает перечитывание', () => {
    writeDevice({ level: 'medium' })
    writeDevice({ rate: 1.25, volume: 0.4 })
    const counts = { easy: 10, medium: 20, hard: 10 }
    writeDevice({ counts })
    const now = readDevice()
    expect(now).toMatchObject({ level: 'medium', rate: 1.25, volume: 0.4, counts })
    expect(JSON.parse(localStorage.getItem(LISTENCHOOSE_RUN_KEY))).toEqual(now)
  })

  it('наборы пишутся по сложностям и не затирают друг друга, если их передают целиком', () => {
    const easy = { queue: ['a'], index: 0, rounds: {}, complete: false }
    const hard = { queue: ['b'], index: 0, rounds: {}, complete: true }
    writeDevice({ runs: { easy } })
    writeDevice({ runs: { ...readDevice().runs, hard } })
    expect(readDevice().runs).toEqual({ easy, hard })
  })

  it('хранилище не пишет — живём на зеркале, а стёртый ключ (выход) чистит и его', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    writeDevice({ level: 'hard' })
    expect(readDevice().level).toBe('hard')
    expect(isDeviceStorageBroken()).toBe(true)
    setItem.mockRestore()
    writeDevice({ level: 'medium' })
    expect(isDeviceStorageBroken()).toBe(false)
    localStorage.removeItem(LISTENCHOOSE_RUN_KEY)
    expect(readDevice()).toEqual(DEFAULT_DEVICE)
  })
})
