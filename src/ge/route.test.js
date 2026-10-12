import { describe, it, expect } from 'vitest'
import {
  canSetGoal, currentFormat, fitsDeadline, formatTerm, recommendRoute, remainingLessons, routeOptions, termFor, termUnits, windowDate,
} from './route.js'

const TODAY = new Date(2026, 9, 12)

describe('remainingLessons', () => {
  it('курсы силлабуса до цели минус пройденная доля текущего', () => {
    expect(remainingLessons('B1', 'B2', 0)).toBe(36)
    expect(remainingLessons('B1', 'B2', 50)).toBe(18)
    expect(remainingLessons('A0', 'C1', 0)).toBe(176)
    expect(remainingLessons('A2', 'B2', 100)).toBe(36)
  })
  it('цель не выше уровня или уровень вне лестницы — ноль', () => {
    expect(remainingLessons('B2', 'B1', 0)).toBe(0)
    expect(remainingLessons('C2', 'C1', 0)).toBe(0)
    expect(remainingLessons(null, 'B1', 0)).toBe(0)
  })
})

describe('termFor', () => {
  it('B1→B2, 30 минут в день: 30 / 20 / 16 недель ≈ 7 / 4,5 / 3,5 месяца', () => {
    expect(termFor('self_study', 36, 30)).toEqual({ weeks: 30, months: 7 })
    expect(termFor('group', 36, 30)).toEqual({ weeks: 20, months: 4.5 })
    expect(termFor('individual', 36, 30)).toEqual({ weeks: 16, months: 3.5 })
  })
  it('уроков нет — срока нет', () => {
    expect(termFor('group', 0, 30)).toEqual({ weeks: 0, months: 0 })
  })
})

describe('termUnits / formatTerm', () => {
  const t = (key, vars) => `${key}|${vars.n}`
  it('до полутора лет месяцами, дальше годами с шагом полгода', () => {
    expect(termUnits({ weeks: 30, months: 7 })).toEqual({ unit: 'months', n: 7 })
    expect(termUnits({ weeks: 146, months: 33.5 })).toEqual({ unit: 'years', n: 3 })
  })
  it('дробное число берёт форму few и запятую', () => {
    expect(formatTerm({ unit: 'months', n: 4.5 }, t, 'ru')).toBe('geTerm.months.few|4,5')
    expect(formatTerm({ unit: 'months', n: 7 }, t, 'ru')).toBe('geTerm.months.many|7')
    expect(formatTerm({ unit: 'years', n: 2.5 }, t, 'en')).toBe('geTerm.years.few|2.5')
  })
})

describe('fitsDeadline', () => {
  const term = { weeks: 30, months: 7 } // 210 дней
  it('ровно к сроку — успевает, с запасом от трёх недель', () => {
    expect(fitsDeadline(term, '2027-05-10', TODAY)).toBe('fits')
    expect(fitsDeadline(term, '2027-05-09', TODAY)).toBe('late')
    expect(fitsDeadline(term, '2027-06-01', TODAY)).toBe('spare')
    expect(fitsDeadline(term, null, TODAY)).toBe(null)
  })
  it('окно переводится в верхнюю границу', () => {
    expect(windowDate('3-6m', TODAY)).toBe('2027-04-12')
    expect(windowDate('none', TODAY)).toBe(null)
  })
})

describe('recommendRoute', () => {
  // B1→B2 = 36 уроков: сам — 210 дней, группа — 140, индивидуально — 112
  const opts = (deadlineIso, level = 'B1', target = 'B2') =>
    routeOptions({ targetLevel: target, dailyMinutes: 30, deadlineIso }, { level, percent: 0 }, TODAY)
  it('сам не успевает, группа успевает → группа', () => {
    expect(recommendRoute(opts('2027-03-12'), { purpose: 'self', level: 'B1', targetLevel: 'B2' })).toEqual({ route: 'group', late: false })
  })
  it('группа не успевает, индивидуально успевает → индивидуально', () => {
    expect(recommendRoute(opts('2027-02-12'), { purpose: 'self', level: 'B1', targetLevel: 'B2' })).toEqual({ route: 'individual', late: false })
  })
  it('никто не успевает → индивидуально с пометкой', () => {
    expect(recommendRoute(opts('2026-12-01'), { purpose: 'self', level: 'B1', targetLevel: 'B2' })).toEqual({ route: 'individual', late: true })
  })
  it('без срока: работа и разрыв от двух уровней — группа, иначе сам', () => {
    expect(recommendRoute(opts(null, 'A2', 'B2'), { purpose: 'work', level: 'A2', targetLevel: 'B2' }).route).toBe('group')
    expect(recommendRoute(opts(null, 'A2', 'B2'), { purpose: 'travel', level: 'A2', targetLevel: 'B2' }).route).toBe('self_study')
    expect(recommendRoute(opts(null), { purpose: 'work', level: 'B1', targetLevel: 'B2' }).route).toBe('self_study')
  })
})

describe('canSetGoal / currentFormat', () => {
  it('цель ставится ниже C1 и без уровня', () => {
    expect(canSetGoal(null)).toBe(true)
    expect(canSetGoal('B2')).toBe(true)
    expect(canSetGoal('C1')).toBe(false)
    expect(canSetGoal('C2')).toBe(false)
  })
  it('формат — по последнему занятию, кроме пробного', () => {
    expect(currentFormat([])).toBe(null)
    expect(currentFormat([{ lessonType: 'TRIAL', scheduledAt: '2026-10-01' }])).toBe(null)
    expect(
      currentFormat([
        { lessonType: 'GROUP', scheduledAt: '2026-09-01T10:00' },
        { lessonType: 'INDIVIDUAL_PREMIUM', scheduledAt: '2026-10-01T10:00' },
      ]),
    ).toBe('individual')
    expect(currentFormat([{ lessonType: 'PAIR', scheduledAt: '2026-10-01' }])).toBe('group')
  })
})
