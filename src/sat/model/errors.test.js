import { describe, it, expect } from 'vitest'
import { filterErrors, normType, paginate, reasonCounts, reviewedShare, sortErrors, statusCounts, statusOf } from './errors.js'

const TYPES = ['knowledge', 'misread', 'calculation', 'strategy', 'time', 'careless']
const list = [
  { id: 1, due: true, errorType: 'misread', createdAt: '2026-10-01' },
  { id: 2, due: false, errorType: 'misread', createdAt: '2026-10-05' },
  { id: 3, due: false, resolvedAt: '2026-10-10', errorType: 'time pressure', createdAt: '2026-09-20', logged: true },
  { id: 4, due: true, errorType: null, createdAt: '2026-10-07' },
]

describe('журнал ошибок', () => {
  it('статус строки и плитки', () => {
    expect(list.map(statusOf)).toEqual(['due', 'waiting', 'resolved', 'due'])
    expect(statusCounts(list)).toEqual({ all: 4, due: 2, waiting: 1, resolved: 1 })
    expect(reviewedShare(statusCounts(list))).toBe(25)
    expect(reviewedShare(statusCounts([]))).toBe(0)
  })

  it('причины словами прототипа — те же типы', () => {
    expect(normType('knowledge gap')).toBe('knowledge')
    expect(normType('time pressure')).toBe('time')
    expect(normType('misread')).toBe('misread')
    expect(normType(null)).toBeNull()
  })

  it('причины одной строкой: по убыванию, «без причины» последней', () => {
    const r = reasonCounts(list, TYPES)
    expect(r[0]).toEqual({ key: 'misread', n: 2 })
    expect(r[1]).toEqual({ key: 'time', n: 1 })
    expect(r[r.length - 1]).toEqual({ key: 'none', n: 1 })
    expect(reasonCounts([], TYPES).some((x) => x.key === 'none')).toBe(false)
  })

  it('фильтр по статусу и причине', () => {
    expect(filterErrors(list, { status: 'due' }).map((e) => e.id)).toEqual([1, 4])
    expect(filterErrors(list, { kind: 'misread' }).map((e) => e.id)).toEqual([1, 2])
    expect(filterErrors(list, { kind: 'time' }).map((e) => e.id)).toEqual([3])
    expect(filterErrors(list, { status: 'due', kind: 'none' }).map((e) => e.id)).toEqual([4])
  })

  it('записанные «Log error» первыми, потом новые', () => {
    expect(sortErrors(list).map((e) => e.id)).toEqual([3, 4, 2, 1])
  })

  it('по десять на страницу, номер страницы в границах', () => {
    const many = Array.from({ length: 23 }, (_, i) => i)
    expect(paginate(many, 1)).toMatchObject({ page: 1, pages: 3 })
    expect(paginate(many, 3).items).toEqual([20, 21, 22])
    expect(paginate(many, 9).page).toBe(3)
    expect(paginate(many, 0).page).toBe(1)
    expect(paginate([], 2)).toEqual({ page: 1, pages: 1, items: [] })
  })
})
