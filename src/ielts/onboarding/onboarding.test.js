import { describe, it, expect } from 'vitest'
import { estimateTerm, fitsExam, onboardingBody, recommendRoute, routeOptions } from './onboarding.js'

const today = new Date('2026-10-01T10:00:00')

describe('онбординг и маршрут IELTS', () => {
  it('срок: часы = разрыв × 160, 6 занятий в неделю; с преподавателем быстрее', () => {
    // разрыв 1.0, час в день: 160 ч / 6 ч в неделю ≈ 27 недель ≈ 6 месяцев
    expect(estimateTerm(1, 60)).toEqual({ long: false, weeks: 27, months: 6 })
    expect(estimateTerm(1, 60, 2).weeks).toBe(13)
    expect(estimateTerm(2.5, 60).long).toBe(true)
  })

  it('успевает ли к экзамену — по неделям срока', () => {
    expect(fitsExam({ weeks: 10, long: false }, '2026-12-12', today)).toBe(true)
    expect(fitsExam({ weeks: 20, long: false }, '2026-12-12', today)).toBe(false)
    expect(fitsExam({ weeks: 20, long: false }, null, today)).toBeNull()
  })

  it('правила маршрута §11.4', () => {
    expect(recommendRoute({ targetBand: 7, bands: { overall: 4 } }).route).toBe('teacher')
    expect(recommendRoute({ targetBand: 7.5, bands: { overall: 6 } }).route).toBe('teacher')
    expect(recommendRoute({ targetBand: 7, bands: { overall: 6.5 } }).route).toBe('platform')
    expect(recommendRoute({ targetBand: 7, bands: { overall: 6 } }).route).toBe('mix')
    expect(recommendRoute({ targetBand: 7, examDate: '2026-10-15', bands: { overall: 6 } }, today).route).toBe('teacher')
    expect(recommendRoute({ targetBand: 7 })).toBeNull()
  })

  it('три маршрута со сроком и проверкой даты', () => {
    const r = routeOptions({ targetBand: 7, dailyMinutes: 60, examDate: '2027-01-15', bands: { overall: 6 } }, today) // 106 дней: 27 недель — нет, 13 — да
    expect(r.map((x) => x.id)).toEqual(['platform', 'mix', 'teacher'])
    expect(r[0].fits).toBe(false)
    expect(r[2].fits).toBe(true)
  })

  it('тело профиля: дата только при «знаю дату», цель по умолчанию 6.5', () => {
    expect(onboardingBody({ track: 'general', window: '3-6m', examDate: '2026-12-12', daily: 90 })).toEqual({
      purpose: null, track: 'general', targetBand: 6.5, examDate: null, examWindow: '3-6m', dailyMinutes: 90, familiarity: null,
    })
  })
})
