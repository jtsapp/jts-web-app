import { describe, expect, it } from 'vitest'
import {
  baselineSnapshot, bluebookCheck, compareChart, compareHeadline, domainRows, domainStatus, nextCheck, phaseAfter, phaseOfTest,
  scoreRows, testParam,
} from './compare.js'
import live from '../plan/__fixtures__/roadmap-live.json'

const test6 = { test: 6, entered: true, rw: 520, math: 580, total: 1100, deltaRw: null, deltaMath: null, deltaTotal: null }
const test8 = { test: 8, entered: true, rw: 560, math: 620, total: 1180, deltaRw: 40, deltaMath: 40, deltaTotal: 80 }
const test10 = { test: 10, entered: true, rw: 590, math: 670, total: 1260, deltaRw: 70, deltaMath: 90, deltaTotal: 160 }
const empty10 = { test: 10, entered: false, total: null }

describe('форма Bluebook (Figma «NEW 2», 17:8284 / 17:8367)', () => {
  it('сохранить можно, только когда Total = Math + R&W', () => {
    expect(bluebookCheck({ total: '1180', rw: '560', math: '620' })).toEqual({ state: 'match', sum: 1180 })
    expect(bluebookCheck({ total: '1200', rw: '560', math: '620' })).toEqual({ state: 'mismatch', sum: 1180 })
    expect(bluebookCheck({ total: '', rw: '560', math: '620' })).toEqual({ state: 'incomplete', sum: 1180 })
    expect(bluebookCheck({ total: '1180', rw: '565', math: '620' })).toEqual({ state: 'incomplete', sum: null })
    expect(bluebookCheck({ total: '1180', rw: '', math: '620' }).state).toBe('incomplete')
  })

  it('тест из адреса: 6, 8, 10; сравнение — только 8 и 10', () => {
    expect(testParam('8')).toBe(8)
    expect(testParam('6')).toBe(6)
    expect(testParam('7')).toBeNull()
    expect(testParam(null)).toBeNull()
    expect(testParam('6', { compare: true })).toBeNull()
    expect(testParam('10', { compare: true })).toBe(10)
  })
})

describe('сравнение после теста (17:8528 / 17:8678 / 17:8831)', () => {
  it('рост после Test 8, три точки после Test 10, «почти не изменился» без роста', () => {
    expect(compareHeadline([test6, test8, empty10], 8)).toEqual({ variant: 'grew', delta: 80, chain: [1100, 1180], tests: [6, 8] })
    expect(compareHeadline([test6, test8, test10], 10)).toMatchObject({ variant: 'three', delta: 160, chain: [1100, 1180, 1260] })
    const flat = { ...test8, total: 1090, deltaTotal: -10 }
    expect(compareHeadline([test6, flat], 8)).toMatchObject({ variant: 'flat', delta: -10 })
    expect(compareHeadline([test6, { ...test8, deltaTotal: 10 }], 8).variant).toBe('flat')
    expect(compareHeadline([test6, { ...test8, deltaTotal: 20 }], 8).variant).toBe('grew')
    // Test 10 после Test 6 без Test 8 — две точки, рост
    expect(compareHeadline([test6, test10], 10)).toMatchObject({ variant: 'grew', tests: [6, 10] })
  })

  it('сравнивать не с чем — null', () => {
    expect(compareHeadline([test8], 8)).toBeNull()
    expect(compareHeadline([test6, empty10], 10)).toBeNull()
    expect(compareHeadline([test6], 6)).toBeNull()
  })

  it('строки баллов: от Test 6, рост — зелёный, остальное нейтральное', () => {
    expect(scoreRows([test6, { ...test8, deltaMath: -20, math: 560 }], 8)).toEqual([
      { key: 'total', from: 1100, to: 1180, delta: 80, up: true },
      { key: 'rw', from: 520, to: 560, delta: 40, up: true },
      { key: 'math', from: 580, to: 560, delta: -20, up: false },
    ])
    expect(scoreRows([test6], 8)).toEqual([])
  })

  it('домены: «Новый приоритет», «Закрыто», «Осталось»; уверенный и раньше — без статуса', () => {
    const before = { id: 'm.geo', band: 'weak' }
    expect(domainStatus({ id: 'm.geo', band: 'weak' }, before, ['m.geo'], [])).toBe('new')
    expect(domainStatus({ id: 'm.geo', band: 'weak' }, before, ['m.geo'], ['m.geo'])).toBe('left')
    expect(domainStatus({ id: 'm.alg', band: 'strong' }, { id: 'm.alg', band: 'shaky' }, [], [])).toBe('closed')
    expect(domainStatus({ id: 'm.alg', band: 'strong' }, null, [], [])).toBe('closed')
    expect(domainStatus({ id: 'm.alg', band: 'strong' }, { id: 'm.alg', band: 'strong' }, [], [])).toBeNull()
    expect(domainStatus({ id: 'rw.ei', band: 'none' }, null, [], [])).toBe('left')
  })

  it('строки карты доменов — проценты было → стало, без строк без статуса', () => {
    const snap = { test: 6, focus: ['rw.ei'], domains: [{ id: 'm.alg', band: 'shaky', accuracy: 0 }, { id: 'rw.ii', band: 'strong', accuracy: 0.9 }, { id: 'rw.ei', band: 'weak', accuracy: 0.45 }] }
    const now = [
      { id: 'm.alg', section: 'math', band: 'strong', accuracy: 0.68 },
      { id: 'rw.ii', section: 'rw', band: 'strong', accuracy: 0.91 },
      { id: 'rw.ei', section: 'rw', band: 'shaky', accuracy: 0.52 },
      { id: 'm.geo', section: 'math', band: 'weak', accuracy: 0.12 },
    ]
    expect(domainRows(now, snap, ['m.geo', 'rw.ei'])).toEqual([
      { id: 'm.alg', section: 'math', from: 0, now: 68, status: 'closed' },
      { id: 'rw.ei', section: 'rw', from: 45, now: 52, status: 'left' },
      { id: 'm.geo', section: 'math', from: 0, now: 12, status: 'new' },
    ])
    expect(domainRows(now.slice(3), null, [])[0]).toMatchObject({ from: null, status: 'left' })
  })

  it('точка отсчёта доменов — снимок Test 6, иначе самый ранний до теста', () => {
    const s6 = { test: 6 }
    const s8 = { test: 8 }
    expect(baselineSnapshot([s8, s6], 10)).toBe(s6)
    expect(baselineSnapshot([s8], 10)).toBe(s8)
    expect(baselineSnapshot([s8], 8)).toBeNull()
  })

  it('шкала графика — по 200 вокруг точек и цели, точки слева направо', () => {
    const c = compareChart([1100, 1180], 1350, { w: 500, h: 180, l: 40, r: 20, t: 16, b: 24 })
    expect(c.ticks.map((x) => x.v)).toEqual([1000, 1200, 1400])
    expect(c.points.map((p) => Math.round(p.x))).toEqual([70, 450])
    expect(c.points[0].y).toBeGreaterThan(c.points[1].y)
    expect(c.goal).toBeLessThan(c.points[1].y)
    expect(compareChart([], 1350)).toBeNull()
    // цель вне шкалы не рисуется: шкала не уже 400 и не выше 1600
    expect(compareChart([1500, 1580], null).ticks.map((x) => x.v)).toEqual([1200, 1400, 1600])
  })
})

describe('сравнение и роудмап', () => {
  const r = live.roadmap.roadmap

  it('следующая фаза и фаза самого теста', () => {
    expect(phaseOfTest(r, 8)).toBe(3)
    expect(phaseAfter(r, 8).n).toBe(4)
    expect(phaseAfter(r, 10).kind).not.toBe('exam')
    expect(phaseAfter(null, 8)).toBeNull()
  })

  it('следующая проверка: Test 10 после недели 8, через целые недели; после Test 10 — нет', () => {
    expect(nextCheck(r, 8, new Date(2026, 10, 2))).toEqual({ test: 10, week: 8, weeks: 4 })
    expect(nextCheck(r, 8, new Date(2026, 10, 29)).weeks).toBe(1)
    expect(nextCheck(r, 10)).toBeNull()
  })
})
