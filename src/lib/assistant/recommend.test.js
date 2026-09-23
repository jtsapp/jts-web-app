import { describe, it, expect } from 'vitest'
import { pickRecommendation } from './recommend.js'

const NOW = new Date('2026-09-23T12:00:00Z').getTime()
const hoursAgo = (h) => new Date(NOW - h * 3600_000).toISOString()
const hoursAhead = (h) => new Date(NOW + h * 3600_000).toISOString()

const weak = (skill, percent) => ({ summary: { weakest: { skill, percent } } })

describe('рекомендация дня', () => {
  it('без сигналов — ничего не советует, не выдумывает', () => {
    expect(pickRecommendation({ summary: {}, now: NOW })).toBeNull()
  })

  describe('приоритет 1 — домашка', () => {
    it('просрочена — «горит», ведёт в homework', () => {
      const r = pickRecommendation({
        summary: {},
        homework: [{ status: 'ASSIGNED', dueDate: hoursAgo(2) }],
        now: NOW,
      })
      expect(r).toStrictEqual({
        reasonKey: 'home.recommend.hwOverdue',
        ctaKey: 'home.recommend.hwCta',
        nav: { to: 'homework' },
      })
    })

    it('срок через 40 часов — «скоро», не «горит»', () => {
      const r = pickRecommendation({
        summary: {},
        homework: [{ status: 'ASSIGNED', dueDate: hoursAhead(40) }],
        now: NOW,
      })
      expect(r.reasonKey).toBe('home.recommend.hwSoon')
    })

    it('срок через 72 часа — рано, домашка не мешает следующим правилам', () => {
      const r = pickRecommendation({
        ...weak('listening', 40),
        homework: [{ status: 'ASSIGNED', dueDate: hoursAhead(72) }],
        now: NOW,
      })
      expect(r.reasonKey).toBe('home.recommend.weakSkill')
    })

    it('сданная и проверенная работа не в счёт, даже если просрочена', () => {
      const r = pickRecommendation({
        ...weak('listening', 40),
        homework: [
          { status: 'submitted', dueDate: hoursAgo(5) },
          { status: 'Graded', dueDate: hoursAgo(1) },
        ],
        now: NOW,
      })
      expect(r.reasonKey).toBe('home.recommend.weakSkill')
    })

    it('без срока — не «горит»: бессрочное не должно маскироваться под спешку', () => {
      const r = pickRecommendation({
        ...weak('listening', 40),
        homework: [{ status: 'ASSIGNED', dueDate: null }],
        now: NOW,
      })
      expect(r.reasonKey).toBe('home.recommend.weakSkill')
    })

    it('берёт ближайший срок среди нескольких открытых работ', () => {
      const r = pickRecommendation({
        summary: {},
        homework: [
          { status: 'ASSIGNED', dueDate: hoursAhead(200) },
          { status: 'ASSIGNED', dueDate: hoursAhead(10) },
        ],
        now: NOW,
      })
      expect(r.reasonKey).toBe('home.recommend.hwSoon')
    })
  })

  describe('приоритет 2 — слабый навык', () => {
    it('навык ниже порога — тренажёр этого навыка', () => {
      const r = pickRecommendation({ ...weak('writing', 55), now: NOW })
      expect(r).toStrictEqual({
        reasonKey: 'home.recommend.weakSkill',
        reasonVars: { skill: 'writing' },
        ctaKey: 'home.recommend.weakSkillCta',
        nav: { to: 'writing' },
      })
    })

    it('навык на пороге (60%) уже не считается слабым', () => {
      expect(pickRecommendation({ ...weak('reading', 60), now: NOW })).toBeNull()
    })

    it('grammar ведёт в practice с фильтром, а не на отдельный экран', () => {
      const r = pickRecommendation({ ...weak('grammar', 30), now: NOW })
      expect(r.nav).toStrictEqual({ to: 'practice', payload: { filter: 'grammar' } })
    })

    it('speaking ведёт в Speaking Buddy', () => {
      expect(pickRecommendation({ ...weak('speaking', 20), now: NOW }).nav).toStrictEqual({ to: 'tutor' })
    })

    it('weakest нет (навыки ровные) — правило пропускается', () => {
      const r = pickRecommendation({
        summary: { weakest: null },
        occurrences: [{ scheduledAt: hoursAgo(400) }],
        now: NOW,
      })
      expect(r.reasonKey).toBe('home.recommend.noLesson')
    })
  })

  describe('приоритет 3 — давно не было занятия', () => {
    it('последнее занятие 15 дней назад — предлагает Speaking Buddy', () => {
      const r = pickRecommendation({
        summary: {},
        occurrences: [{ scheduledAt: hoursAgo(15 * 24) }],
        now: NOW,
      })
      expect(r).toStrictEqual({
        reasonKey: 'home.recommend.noLesson',
        ctaKey: 'home.recommend.noLessonCta',
        nav: { to: 'tutor' },
      })
    })

    it('занятие было 5 дней назад — рано, рекомендации нет', () => {
      expect(pickRecommendation({ summary: {}, occurrences: [{ scheduledAt: hoursAgo(5 * 24) }], now: NOW })).toBeNull()
    })

    it('будущее занятие в расписании не считается «последним»', () => {
      const r = pickRecommendation({
        summary: {},
        occurrences: [{ scheduledAt: hoursAhead(24) }, { scheduledAt: hoursAgo(20 * 24) }],
        now: NOW,
      })
      expect(r.reasonKey).toBe('home.recommend.noLesson')
    })

    it('без единого прошедшего занятия — правило не срабатывает (не с чем сравнивать)', () => {
      expect(pickRecommendation({ summary: {}, occurrences: [{ scheduledAt: hoursAhead(24) }], now: NOW })).toBeNull()
    })
  })

  it('порядок приоритета: горящая домашка перекрывает и слабый навык, и молчание', () => {
    const r = pickRecommendation({
      ...weak('listening', 10),
      homework: [{ status: 'ASSIGNED', dueDate: hoursAgo(1) }],
      occurrences: [{ scheduledAt: hoursAgo(30 * 24) }],
      now: NOW,
    })
    expect(r.reasonKey).toBe('home.recommend.hwOverdue')
  })
})
