import { describe, expect, it } from 'vitest'
import colleges from '../data/colleges.json'
import { byCountry, countriesIn, countryOf, groupByCountry } from './colleges.js'

const by = Object.fromEntries(colleges.rows.map((c) => [c.id, c]))
const TYPES = ['middle_50', 'minimum', 'full_range']

/** Данные вузов — решения SAT, «1. Данные вузов» и «Требования к модели данных». */
describe('данные вузов SAT', () => {
  it('список из решения: США 20, Великобритания 6, Казахстан 1, Южная Корея 7; заглушек прототипа нет', () => {
    const count = Object.fromEntries(groupByCountry(colleges.rows).map((g) => [g.country, g.rows.length]))
    expect(count).toEqual({ US: 20, GB: 6, KZ: 1, KR: 7 })
    for (const id of ['nus', 'uoft', 'kimep', 'uiuc']) expect(by[id]).toBeUndefined()
    expect(new Set(colleges.rows.map((c) => c.id)).size).toBe(colleges.rows.length)
  })

  it('у каждого вуза страна, источник и тип балла либо причина, почему балла нет', () => {
    for (const c of colleges.rows) {
      expect(countryOf(c), c.id).toBeTruthy()
      expect(c.source.url, c.id).toMatch(/^https:\/\//)
      if (c.source.isIndex) expect(c.source.indexUrl, c.id).toBe(c.source.url)
      if (c.score) expect(TYPES, c.id).toContain(c.score.type)
      else expect(['not_published', 'no_data'], c.id).toContain(c.scoreMissing)
    }
  })

  it('все четыре сочетания Total и секций допустимы; Total не равен сумме секций по построению', () => {
    expect(by.mit.score).toMatchObject({ total: [1520, 1570], rw: [740, 780], math: [780, 800] })
    expect(by.harvard.score).toMatchObject({ total: null, rw: [720, 770], math: [730, 790] })
    expect(by.caltech.score.total).toBeNull()
    expect(by.upenn.score).toMatchObject({ total: [1440, 1550], rw: null, math: null })
    // MIT: 780 + 800 = 1580, а верх Total — 1570; сумма секций — не Total
    expect(by.mit.score.total[1]).not.toBe(by.mit.score.rw[1] + by.mit.score.math[1])
  })

  it('годы политики и баллов раздельно: CDS 2025-26 — Fall 2025 и Fall 2027, иначе год из решения или null', () => {
    expect(by.mit).toMatchObject({ scoresYear: 'Fall 2025', policyYear: 'Fall 2027' })
    expect(by.stanford).toMatchObject({ scoresYear: 'Fall 2023', policyYear: null })
    expect(by.brown.scoresYear).toBe('Fall 2024')
    expect(by.upenn.scoresYear).toBe('Fall 2026')
    expect(by.purdue).toMatchObject({ scoresYear: null, policyYear: null })
  })

  it('Британия — порог, Казахстан — ориентир, Корея — без балла', () => {
    for (const c of byCountry(colleges.rows, 'GB')) expect(c.score.type, c.id).toBe('minimum')
    expect(by.imperial.score.total).toEqual([1460, null])
    expect(by.kcl.score.total).toEqual([1230, 1440])
    expect(by.warwick.extra.ru).toBe('только как GCSE, эквивалент A-level дают AP')
    expect(by.imperial.extra.ru).toBe('только вместе с AP')
    expect(by.nazarbayev.score).toMatchObject({ type: 'full_range', total: [1400, null] })
    for (const c of byCountry(colleges.rows, 'KR')) expect([c.score, c.scoreMissing], c.id).toEqual([null, 'not_published'])
  })

  it('доля приславших тест — только у четырёх вузов из решения', () => {
    const pct = Object.fromEntries(colleges.rows.filter((c) => c.submittedPct != null).map((c) => [c.id, c.submittedPct]))
    expect(pct).toEqual({ mit: 83, stanford: 47, umich: 55, caltech: 78 })
  })

  it('ссылка-индекс помечена: Georgia Tech, Harvard, Purdue', () => {
    expect(colleges.rows.filter((c) => c.source.isIndex).map((c) => c.id).sort()).toEqual(['gatech', 'harvard', 'purdue'])
  })
})

describe('страны вузов SAT', () => {
  it('чипы — только страны из данных, в порядке США · Великобритания · Казахстан · Южная Корея', () => {
    expect(countriesIn(colleges.rows)).toEqual(['US', 'GB', 'KZ', 'KR'])
    expect(countriesIn([{ id: 'x', country: 'FR' }, { id: 'y', country: 'KR' }])).toEqual(['KR', 'FR'])
  })

  it('фильтр и группы по стране', () => {
    expect(byCountry(colleges.rows, 'KZ').map((c) => c.id)).toEqual(['nazarbayev'])
    expect(byCountry(colleges.rows, 'all')).toHaveLength(colleges.rows.length)
    expect(groupByCountry(colleges.rows).map((g) => g.country)).toEqual(['US', 'GB', 'KZ', 'KR'])
  })
})
