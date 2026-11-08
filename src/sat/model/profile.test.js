import { describe, it, expect } from 'vitest'
import {
  collegeBand, dateStatus, domainShares, inReach, isSkewed, MIN_MARGIN, pick, rankByCountry, rankColleges, reachSummary,
  roundSection, splitLead, splitTotal, suggestGoal, upcomingDates,
} from './profile.js'
import { byCountry } from './colleges.js'
import taxonomy from '../data/taxonomy.json'
import colleges from '../data/colleges.json'

const by = Object.fromEntries(colleges.rows.map((c) => [c.id, c]))

describe('цель SAT', () => {
  it('балл секции округляется до 10 и зажимается в 200–800, а не отвергается', () => {
    expect(roundSection(705)).toBe(710)
    expect(roundSection(694)).toBe(690)
    expect(roundSection(950)).toBe(800)
    expect(roundSection(10)).toBe(200)
    expect(roundSection('abc')).toBeNull()
  })

  it('пресет итога делится на секции кратно 10', () => {
    expect(splitTotal(1350)).toEqual({ rw: 670, math: 680 })
    expect(splitTotal(1220)).toEqual({ rw: 610, math: 610 })
  })

  it('middle_50: in / above / near / below по Total', () => {
    expect(collegeBand(1350, by.umich)).toBe('near')
    expect(collegeBand(1400, by.umich)).toBe('in')
    expect(collegeBand(1550, by.umich)).toBe('above')
    expect(collegeBand(1200, by.umich)).toBe('below')
  })

  it('middle_50 без Total — по каждой секции, худшая; итогом без секций не сравнить', () => {
    expect(collegeBand({ rw: 730, math: 760 }, by.harvard)).toBe('in')
    expect(collegeBand({ rw: 700, math: 800 }, by.harvard)).toBe('near')
    expect(collegeBand({ rw: 650, math: 800 }, by.harvard)).toBe('below')
    expect(collegeBand(1500, by.harvard)).toBeNull()
  })

  it('minimum и full_range: порог или ориентир пройден — pass; без балла — null', () => {
    expect(collegeBand(1460, by.imperial)).toBe('pass')
    expect(collegeBand(1400, by.imperial)).toBe('near')
    expect(collegeBand(1300, by.imperial)).toBe('below')
    expect(collegeBand(1230, by.kcl)).toBe('pass')
    expect(collegeBand(1400, by.nazarbayev)).toBe('pass')
    expect(collegeBand(1600, by.kaist)).toBeNull()
    expect(collegeBand(1600, by.georgetown)).toBeNull()
  })

  it('«в досягаемости» не считает «чуть ниже» и вузы без балла', () => {
    const goal = { rw: 680, math: 690 } // 1370
    const kr = byCountry(colleges.rows, 'KR')
    expect(reachSummary(goal, kr)).toEqual({ n: 0, total: 0 })
    const gb = byCountry(colleges.rows, 'GB')
    // 1370 ≥ 1340 (Warwick), 1290 ×2, 1230 (KCL); ниже Imperial 1460 и UCL 1440
    expect(reachSummary(goal, gb)).toEqual({ n: 4, total: 6 })
    const us = reachSummary(goal, byCountry(colleges.rows, 'US'))
    expect(us.total).toBe(17) // UT Austin, Georgetown, NYU без балла
  })

  it('ранжирование — только внутри страны: группы в порядке чипов, достижимые первыми', () => {
    const groups = rankByCountry(1370, colleges.rows)
    expect(groups.map((g) => g.country)).toEqual(['US', 'GB', 'KZ', 'KR'])
    const us = groups[0].rows
    const firstNotReach = us.findIndex((c) => !inReach(c.band))
    expect(us.slice(firstNotReach).some((c) => inReach(c.band))).toBe(false)
    expect(us.at(-1).band).toBeNull()
    expect(rankColleges(1370, byCountry(colleges.rows, 'GB'))[0].band).toBe('pass')
  })

  it('подставляемая цель: middle_50 — верх, без Total — верх секций, порог и ориентир — с запасом', () => {
    expect(suggestGoal(by.umich)).toEqual(splitTotal(1530))
    expect(suggestGoal(by.harvard)).toEqual({ rw: 770, math: 790 })
    expect(suggestGoal(by.columbia)).toEqual(splitTotal(1560))
    const imp = suggestGoal(by.imperial)
    expect(imp.rw + imp.math).toBe(1460 + MIN_MARGIN)
    const kcl = suggestGoal(by.kcl)
    expect(kcl.rw + kcl.math).toBe(1440 + MIN_MARGIN)
    expect(suggestGoal(by.nazarbayev).rw + suggestGoal(by.nazarbayev).math).toBeGreaterThan(1400)
    expect(suggestGoal(by.snu)).toBeNull()
  })

  it('смещённый вверх диапазон — test-optional или меньше половины прислали тест', () => {
    expect(isSkewed(by.umich)).toBe(true)
    expect(isSkewed(by.stanford)).toBe(true)
    expect(isSkewed(by.mit)).toBe(false)
    expect(isSkewed(by.imperial)).toBe(false)
  })
})

describe('дата экзамена', () => {
  const today = new Date(2026, 9, 5) // 5 октября 2026
  const d = (testDate, reg, late, confirmed = true) => ({ testDate, registrationDeadline: reg, lateDeadline: late, confirmed })

  it('регистрация открыта, поздняя, закрыта; ожидаемая дата без дедлайнов', () => {
    expect(dateStatus(d('2026-12-05', '2026-11-20', '2026-11-24'), today)).toMatchObject({ status: 'open', regDays: 46, weeks: 9 })
    expect(dateStatus(d('2026-10-17', '2026-10-02', '2026-10-06'), today)).toMatchObject({ status: 'late', regDays: 1 })
    expect(dateStatus(d('2026-10-10', '2026-09-25', '2026-09-29'), today)).toMatchObject({ status: 'closed', regDays: null })
    expect(dateStatus(d('2027-08-28', null, null, false), today).status).toBe('expected')
  })

  it('прошедшие даты уходят из списка сами', () => {
    const list = upcomingDates([d('2026-10-03', '2026-09-18', '2026-09-22'), d('2026-11-07', '2026-10-23', '2026-10-27')], today)
    expect(list.map((x) => x.testDate)).toEqual(['2026-11-07'])
  })
})

describe('главы', () => {
  it('доли доменов секции — из таксономии и в сумме ровно 100', () => {
    const rw = domainShares(taxonomy, 'rw')
    const math = domainShares(taxonomy, 'math')
    expect(rw.map((x) => x.id)).toEqual(['rw.ii', 'rw.cs', 'rw.ei', 'rw.sec'])
    expect(rw.reduce((a, x) => a + x.percent, 0)).toBe(100)
    expect(math.reduce((a, x) => a + x.percent, 0)).toBe(100)
    expect(rw.every((x) => x.skills.length > 0)).toBe(true)
  })

  it('ведущий <b> пункта — заголовок карточки', () => {
    expect(splitLead('<b>Two sections.</b> Reading and Writing, then Math.')).toEqual({ title: 'Two sections', body: 'Reading and Writing, then Math.' })
    expect(splitLead('Plain text')).toEqual({ title: null, body: 'Plain text' })
    expect(splitLead('<b>Desmos встроен</b> и доступен всю секцию.')).toEqual({ title: null, body: '<b>Desmos встроен</b> и доступен всю секцию.' })
  })

  it('pick берёт язык с откатом на ru', () => {
    expect(pick({ en: 'a', ru: 'б' }, 'kk')).toBe('б')
    expect(pick('400–1600', 'en')).toBe('400–1600')
  })
})
