import { describe, it, expect } from 'vitest'
import { notificationTarget, practiceUnitTarget } from './studentDeepLink.js'

describe('notificationTarget', () => {
  it('opens feedback replies without confusing them with progress reports', () => {
    expect(notificationTarget('/feedback')).toEqual({ screen: 'feedback', payload: null })
    expect(notificationTarget('feedback')).toEqual({ screen: 'feedback', payload: null })
    expect(notificationTarget('/feedback-reports/123')).toEqual({ screen: 'lessons', payload: { tab: 'reports', reportId: '123' } })
  })
  // Уведомления подбора учителя (бэкенд пишет 'teacher-matching') ведут в «Мой учитель», а не в расписание (ТЗ 08 §2.12)
  it('opens teacher matching notices in My teacher', () => {
    expect(notificationTarget('teacher-matching')).toEqual({ screen: 'my-teacher', payload: null })
  })
  it('opens a live lesson from the teacher workspace route', () => {
    expect(notificationTarget('/system/schedule/42/workspace')).toEqual({
      screen: 'lessons',
      payload: { lessonId: 42 },
    })
  })

  it('maps homework links from both apps', () => {
    expect(notificationTarget('homework').screen).toBe('homework')
    expect(notificationTarget('/system/homework').screen).toBe('homework')
  })

  it('maps schedule links to the lessons screen', () => {
    expect(notificationTarget('lessons').screen).toBe('lessons')
    expect(notificationTarget('/system/schedule').screen).toBe('lessons')
  })

  it('отчёт о прогрессе открывается во вкладке «Отчёты», сразу в нём', () => {
    const report = { screen: 'lessons', payload: { tab: 'reports', reportId: '123' } }
    expect(notificationTarget('feedback-reports/123')).toEqual(report)
    expect(notificationTarget('/feedback-reports/123')).toEqual(report)
    expect(notificationTarget('feedback-reports')).toEqual({ screen: 'lessons', payload: { tab: 'reports', reportId: null } })
  })

  it('returns a null screen for empty or unknown links', () => {
    expect(notificationTarget(null).screen).toBeNull()
    expect(notificationTarget('/system/unknown').screen).toBeNull()
  })
})

describe('practiceUnitTarget', () => {
  // Ссылку строит админка: преподаватель должен открыть ровно тот юнит,
  // который выдал на дом.
  it('разбирает уровень и номер юнита', () => {
    expect(practiceUnitTarget('?screen=practice&level=A2&unit=3')).toEqual({ level: 'a2', unitId: '3' })
  })

  // Уровень входит в АДРЕС юнита: «Unit 3» уровня A2 и уровня B1 — разные
  // задания, и открывать по одному номеру нечего.
  it('без уровня или без номера цели нет', () => {
    expect(practiceUnitTarget('?screen=practice&level=a2')).toBeNull()
    expect(practiceUnitTarget('?screen=practice&unit=3')).toBeNull()
    expect(practiceUnitTarget('')).toBeNull()
    expect(practiceUnitTarget(null)).toBeNull()
  })

  it('принимает и готовый URLSearchParams', () => {
    const params = new URLSearchParams('level=b1&unit=12')
    expect(practiceUnitTarget(params)).toEqual({ level: 'b1', unitId: '12' })
  })
})
