import { describe, it, expect } from 'vitest'
import { gapToTarget, scale, scoreBody, tableRows, totalOf, trajectoryPoints, validSection, validateScore } from './scores.js'

describe('ручные баллы: форма', () => {
  it('секция — 200–800 с шагом 10', () => {
    expect(validSection(200)).toBe(true)
    expect(validSection('800')).toBe(true)
    expect(validSection(650)).toBe(true)
    expect(validSection(655)).toBe(false)
    expect(validSection(190)).toBe(false)
    expect(validSection(810)).toBe(false)
    expect(validSection('')).toBe(false)
  })

  it('ошибки по полям: источник, дата (не из будущего), баллы', () => {
    const ok = { source: 'BLUEBOOK', takenOn: '2026-10-01', rw: '650', math: '700' }
    expect(validateScore(ok, '2026-10-14')).toEqual({})
    expect(validateScore({ ...ok, source: 'SIMULATION' }, '2026-10-14')).toEqual({ source: 'source' })
    expect(validateScore({ ...ok, takenOn: '2026-10-20' }, '2026-10-14')).toEqual({ takenOn: 'future' })
    expect(validateScore({ ...ok, takenOn: '' }, '2026-10-14')).toEqual({ takenOn: 'date' })
    expect(validateScore({ ...ok, rw: '651', math: '' }, '2026-10-14')).toEqual({ rw: 'section', math: 'section' })
  })

  it('тело запроса: числа числами, пустая подпись — null', () => {
    expect(scoreBody({ source: 'OFFICIAL', label: '  ', takenOn: '2026-10-04', rw: '700', math: '720' })).toEqual({
      source: 'OFFICIAL', label: null, takenOn: '2026-10-04', rw: 700, math: 720,
    })
  })
})

describe('таблица «Результаты» и траектория', () => {
  // сервер отдаёт старые первыми, id строкой; у симуляции есть диапазон
  const entries = [
    { id: 'mock-1', source: 'SIMULATION', takenOn: '2026-09-01', rw: 600, math: 600, total: 1200, range: { low: 1160, high: 1240 }, mockId: 'mock-1' },
    { id: '7', source: 'BLUEBOOK', label: 'PT 7', takenOn: '2026-09-15', rw: 640, math: 650 },
    { id: 'p1', source: 'PAPER', takenOn: '2026-09-20', rw: 700, math: 700, total: 1400 },
    { id: '8', source: 'OFFICIAL', takenOn: '2026-10-04', rw: 660, math: 700, total: 1360, delta: 70 },
  ]

  it('итог — из секций, если сервер не прислал', () => {
    expect(totalOf({ rw: 640, math: 650 })).toBe(1290)
    expect(totalOf({ total: 1300, rw: 1, math: 1 })).toBe(1300)
    expect(totalOf({ rw: null, math: 650 })).toBeNull()
  })

  it('новые сверху, бумажные тесты не входят, изменение — к предыдущему (или серверное)', () => {
    const rows = tableRows(entries)
    expect(rows.map((r) => r.id)).toEqual(['8', '7', 'mock-1'])
    expect(rows.map((r) => r.delta)).toEqual([70, 90, null])
    expect(rows[1].total).toBe(1290)
  })

  it('траектория — старые слева', () => {
    expect(trajectoryPoints(entries).map((p) => p.total)).toEqual([1200, 1290, 1360])
  })

  it('до цели — от последнего результата', () => {
    expect(gapToTarget(entries, 1500)).toBe(140)
    expect(gapToTarget(entries, 1300)).toBe(-60)
    expect(gapToTarget([], 1500)).toBeNull()
    expect(gapToTarget(entries, null)).toBeNull()
  })

  it('шкала: сотни вокруг точек и цели, не уже 300, в пределах 400–1600', () => {
    expect(scale([1200, 1290, 1500])).toEqual({ lo: 1100, hi: 1600, ticks: [1100, 1200, 1300, 1400, 1500, 1600] })
    expect(scale([500])).toMatchObject({ lo: 400, hi: 700 })
    expect(scale([])).toBeNull()
  })
})
