import { describe, it, expect } from 'vitest'
import { legendKinds, pointKind, roundSection, scale, scoreBody, sectionState, tableRows, totalOf, trajectoryChart, trajectoryPoints, validSection, validateScore } from './scores.js'

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
    expect(validateScore({ ...ok, rw: '95', math: '' }, '2026-10-14')).toEqual({ rw: 'section', math: 'section' })
    // некратный 10 — не ошибка: форма предложила округлить (Figma «NEW 2», 17:4989)
    expect(validateScore({ ...ok, math: '625' }, '2026-10-14')).toEqual({})
  })

  it('округление до 10 и живая проверка поля', () => {
    expect(roundSection('625')).toBe(630)
    expect(roundSection('624')).toBe(620)
    expect(roundSection('805')).toBeNull()
    expect(roundSection('')).toBeNull()
    expect(roundSection('abc')).toBeNull()
    expect(sectionState('')).toBe('empty')
    expect(sectionState('620')).toBe('ok')
    expect(sectionState('625')).toBe('round')
    expect(sectionState('95')).toBe('range')
  })

  it('тело запроса: числа числами, пустая подпись — null', () => {
    expect(scoreBody({ source: 'OFFICIAL', label: '  ', takenOn: '2026-10-04', rw: '700', math: '720' })).toEqual({
      source: 'OFFICIAL', label: null, takenOn: '2026-10-04', rw: 700, math: 720,
    })
    expect(scoreBody({ source: 'JTS', takenOn: '2026-10-04', rw: '565', math: '625' })).toMatchObject({ rw: 570, math: 630 })
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

  it('новые сверху, Past papers — в общей таблице, изменение — к предыдущему по дате любого источника (ТЗ SAT, задача 13)', () => {
    const rows = tableRows(entries)
    expect(rows.map((r) => r.id)).toEqual(['8', 'p1', '7', 'mock-1'])
    expect(rows.map((r) => r.delta)).toEqual([70, 110, 90, null])
    expect(rows[2].total).toBe(1290)
  })

  it('траектория — старые слева, с точкой Past paper', () => {
    expect(trajectoryPoints(entries).map((p) => p.total)).toEqual([1200, 1290, 1400, 1360])
  })

  it('изменение сервера — как есть, и null тоже; отклонённый — без изменения и не база для соседей', () => {
    const rows = tableRows([
      { id: '1', source: 'OFFICIAL', takenOn: '2026-06-08', rw: 540, math: 580, total: 1120, delta: null },
      { id: '2', source: 'BLUEBOOK', takenOn: '2026-08-24', rw: 560, math: 620, total: 1180, delta: null, reviewStatus: 'REJECTED' },
      { id: '3', source: 'PAPER', takenOn: '2026-09-01', rw: 550, math: 600, total: 1150, delta: 30 },
    ])
    expect(rows.map((r) => [r.id, r.delta])).toEqual([['3', 30], ['2', null], ['1', null]])
    // без поля delta (запасной список) — считаем сами, пропуская отклонённый
    const own = tableRows([
      { id: 'a', takenOn: '2026-06-01', total: 1100 },
      { id: 'b', takenOn: '2026-07-01', total: 1300, reviewStatus: 'REJECTED' },
      { id: 'c', takenOn: '2026-08-01', total: 1150 },
    ])
    expect(own.map((r) => r.delta)).toEqual([50, null, null])
    expect(trajectoryPoints(rows).map((p) => p.id)).toEqual(['1', '3'])
  })

  it('график: линия — официальные и Bluebook, симуляция — диапазон, Past paper — точка; месяцы по датам', () => {
    expect(entries.map(pointKind)).toEqual(['sim', 'real', 'paper', 'real'])
    expect(legendKinds(entries)).toEqual(['real', 'sim', 'paper'])
    expect(legendKinds([{ id: 'x', source: 'JTS', takenOn: '2026-01-01', total: 1000 }])).toEqual(['other'])
    const withRange = entries.map((e) => (e.source === 'SIMULATION' ? { ...e, range: { total: { low: 1160, high: 1240 } } } : e))
    const c = trajectoryChart(withRange, 1500)
    expect(c.line.map((p) => p.id)).toEqual(['7', '8'])
    expect(c.ranges).toHaveLength(1)
    expect(c.ranges[0].top).toBeLessThan(c.ranges[0].bottom)
    expect(c.dots.map((d) => d.kind)).toEqual(['paper'])
    expect(c.months.map((m) => m.key)).toEqual(['2026-09', '2026-10'])
    // x по дате: 15 сентября ближе к 20-му, чем к 1-му
    const xs = Object.fromEntries([...c.line, ...c.dots, ...c.ranges].map((p) => [p.id, p.x]))
    expect(xs.p1 - xs['7']).toBeLessThan(xs['7'] - xs['mock-1'])
    expect(c.goal).not.toBeNull()
    expect(trajectoryChart([], 1500)).toBeNull()
  })

  it('шкала: сотни вокруг точек и цели, не уже 300, в пределах 400–1600', () => {
    expect(scale([1200, 1290, 1500])).toEqual({ lo: 1100, hi: 1600, ticks: [1100, 1200, 1300, 1400, 1500, 1600] })
    expect(scale([500])).toMatchObject({ lo: 400, hi: 700 })
    expect(scale([])).toBeNull()
  })
})
