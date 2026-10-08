import { describe, expect, it } from 'vitest'
import { aggLevel, atLevel, bandLabel, groupByLevel, hiddenCount, recommendedRange, studentBandOf } from './levels.js'

const items = [
  { id: 'a', level: 'below', bandMin: 3.5, bandMax: 4.5, studentBand: 6.5 },
  { id: 'b', level: 'fit', bandMin: 6, bandMax: 7, studentBand: 6.5 },
  { id: 'c', level: 'any', bandMin: null, bandMax: null, studentBand: 6.5 },
]

describe('levels', () => {
  it('прячет задания ниже уровня ученика, по просьбе показывает все', () => {
    expect(atLevel(items).map((x) => x.id)).toEqual(['b', 'c'])
    expect(atLevel(items, true).map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(hiddenCount(items)).toBe(1)
    expect(atLevel(null)).toEqual([])
  })

  it('уровень ученика и подпись уровня задания', () => {
    expect(studentBandOf(items)).toBe(6.5)
    expect(studentBandOf([{ id: 'x', studentBand: null }])).toBeNull()
    expect(bandLabel(items[1])).toBe('Band 6.0–7.0')
    expect(bandLabel({ bandMin: 6.5, bandMax: 6.5 })).toBe('Band 6.5')
    expect(bandLabel(items[2])).toBeNull()
  })
})

describe('groupByLevel', () => {
  it('делит список: рекомендуемые, сложнее, неподходящие (ниже уровня) — внизу', () => {
    const g = groupByLevel([{ id: 1, level: 'below' }, { id: 2, level: 'fit' }, { id: 3, level: 'above' }, { id: 4, level: 'any' }])
    expect(g.recommended.map((x) => x.id)).toEqual([2, 4])
    expect(g.harder.map((x) => x.id)).toEqual([3])
    expect(g.unsuitable.map((x) => x.id)).toEqual([1])
  })

  it('уровень набора и рекомендуемый диапазон', () => {
    expect(aggLevel([{ level: 'below' }, { level: 'fit' }])).toBe('fit')
    expect(aggLevel([{ level: 'below' }, { level: 'above' }])).toBe('above')
    expect(aggLevel([{ level: 'below' }])).toBe('below')
    expect(recommendedRange(6.5)).toBe('6.5–7.5')
    expect(recommendedRange(8.5)).toBe('8.5–9.0')
    expect(recommendedRange(null)).toBeNull()
  })
})
