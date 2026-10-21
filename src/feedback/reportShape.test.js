import { describe, it, expect } from 'vitest'
import { SKILL_KEYS, normalizeReport, normalizeReportList } from './reportShape.js'
import { SAMPLE_REPORT, SAMPLE_REPORTS, SAMPLE_LIST, sampleAllowed } from './sample.js'

describe('normalizeReport', () => {
  it('образец разбирается целиком', () => {
    const r = normalizeReport(SAMPLE_REPORT)
    expect(r.lang).toBe('ru')
    expect(r.periodNo).toBe(2)
    expect(r.attendance).toEqual({ done: 8, planned: 9 })
    expect(r.homeworkPct).toBe(85)
    expect(r.skills.map((s) => s.key)).toEqual(SKILL_KEYS)
    expect(r.skills[0]).toEqual({ key: 'speaking', score: 4, prev: 3 })
    expect(r.badges).toEqual([
      { type: 'skills_growth', n: 4 },
      { type: 'goals_achieved', n: 2 },
      { type: 'months_with_jts', n: 2 },
    ])
    expect(r.pastGoals).toHaveLength(3)
    expect(r.seenAt).toBeNull()
  })

  it('навыки всегда шесть и в порядке прототипа; оценка вне 1–5 — без полосы', () => {
    const r = normalizeReport({ skills: [{ key: 'Vocabulary', score: 4 }, { key: 'speaking', score: 9, prev: 0 }] })
    expect(r.skills.map((s) => s.key)).toEqual(SKILL_KEYS)
    expect(r.skills.find((s) => s.key === 'vocabulary')).toEqual({ key: 'vocabulary', score: 4, prev: null })
    expect(r.skills.find((s) => s.key === 'speaking')).toEqual({ key: 'speaking', score: null, prev: null })
  })

  it('пустой ответ — отчёт с пустыми блоками, а не падение', () => {
    const r = normalizeReport({})
    expect(r).toMatchObject({
      lang: 'ru', studentName: '', format: 'individual', attendance: null, homeworkPct: null,
      strengths: [], improvements: [], badges: [], pastGoals: [], nextGoals: [], motivation: null, plan: null,
    })
  })

  it('null — это «нет числа», а не ноль', () => {
    const r = normalizeReport({ homeworkPct: null, attendance: { done: null, planned: 9 }, badges: [{ type: 'homework_hero' }] })
    expect(r.homeworkPct).toBeNull()
    expect(r.attendance).toBeNull()
    expect(r.badges).toEqual([{ type: 'homework_hero', n: null }])
  })

  it('цель без текста выбрасывается, незнакомый статус — без статуса', () => {
    const r = normalizeReport({ pastGoals: [{ text: '  ' }, { text: 'Пройти Unit 3', result: 'maybe' }] })
    expect(r.pastGoals).toEqual([{ text: 'Пройти Unit 3', result: null }])
  })

  it('не объект — null', () => {
    expect(normalizeReport(null)).toBeNull()
    expect(normalizeReport('x')).toBeNull()
  })
})

describe('normalizeReportList', () => {
  it('свежие сверху, записи без id отброшены', () => {
    const list = normalizeReportList([
      { id: 1, periodNo: 1, publishedAt: '2026-09-02T09:40:00+05:00' },
      { periodNo: 9 },
      { id: 2, periodNo: 2, publishedAt: '2026-10-02T10:15:00+05:00' },
    ])
    expect(list.map((x) => x.id)).toEqual([2, 1])
  })

  it('принимает и обёртку { items }', () => {
    expect(normalizeReportList({ items: [{ id: 5 }] }).map((x) => x.id)).toEqual([5])
    expect(normalizeReportList(null)).toEqual([])
  })

  it('образец списка согласован с образцами отчётов', () => {
    const list = normalizeReportList(SAMPLE_LIST)
    expect(list.map((x) => x.id)).toEqual([2, 1])
    for (const item of list) expect(SAMPLE_REPORTS[item.id].periodNo).toBe(item.periodNo)
  })
})

describe('sampleAllowed', () => {
  it('образец только на локалке и дев-стендах', () => {
    expect(sampleAllowed('localhost')).toBe(true)
    expect(sampleAllowed('127.0.0.1')).toBe(true)
    expect(sampleAllowed('dev-tutor.justtostudy.kz')).toBe(true)
    expect(sampleAllowed('ai-tutor.justtostudy.kz')).toBe(false)
    expect(sampleAllowed('')).toBe(false)
  })
})
