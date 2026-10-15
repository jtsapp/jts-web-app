import { describe, it, expect } from 'vitest'
import { collegeBand, dateStatus, domainShares, pick, rankColleges, roundSection, splitLead, splitTotal, upcomingDates } from './profile.js'
import taxonomy from '../data/taxonomy.json'
import colleges from '../data/colleges.json'

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

  it('куда попадает цель относительно middle-50% (Figma 3: Toronto, NU, KIMEP, Michigan при 1350)', () => {
    const by = Object.fromEntries(colleges.rows.map((c) => [c.id, c]))
    const toronto = colleges.rows.find((c) => /Toronto/.test(c.name))
    const nu = colleges.rows.find((c) => /Nazarbayev/.test(c.name))
    const kimep = colleges.rows.find((c) => /KIMEP/.test(c.name))
    const mich = colleges.rows.find((c) => /Michigan/.test(c.name))
    expect(Object.keys(by).length).toBe(16)
    expect(collegeBand(1350, toronto)).toBe('in')
    expect(collegeBand(1350, nu)).toBe('in')
    expect(collegeBand(1350, kimep)).toBe('above')
    expect(collegeBand(1350, mich)).toBe('near')
    const ranked = rankColleges(1350, colleges.rows)
    // «N из 16 в досягаемости»: на макете 5 — демо-цифра (доска «Решения»), по данным прототипа их больше.
    // Проверяем правило, а не число: все достижимые раньше недостижимых, внутри — сначала «в диапазоне».
    const firstBelow = ranked.findIndex((c) => c.band === 'below')
    expect(ranked.slice(firstBelow).every((c) => c.band === 'below')).toBe(true)
    expect(ranked[0].band).toBe('in')
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
