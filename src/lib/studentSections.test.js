import { describe, it, expect } from 'vitest'
import { isSectionOpen, sectionOf } from './studentSections.js'

const group = { known: true, tariff: 'GENERAL', format: 'GROUP', allowed: ['home', 'notifications', 'contracts', 'prizes', 'feedback', 'group', 'lessons', 'homework', 'practice', 'review', 'vocabulary', 'speaking', 'speed'] }

describe('Разделы кабинета ученика по тарифу и формату (ТЗ, 14е)', () => {
  it('ключ пункта меню или экрана → раздел настройки', () => {
    expect(sectionOf('my-teacher')).toBe('teacher')
    expect(sectionOf('teacher-wizard')).toBe('teacher')
    expect(sectionOf('learning')).toBe('review')
    expect(sectionOf('tutor')).toBe('speaking')
    expect(sectionOf('vocab')).toBe('vocabulary')
    expect(sectionOf('course-catalog')).toBe('lessons')
  })

  it('«Главная», «Призы», «Feedback», IELTS и SAT настройке не подлежат — раздела нет', () => {
    for (const key of ['home', 'prizes', 'feedback', 'tokens', 'ielts', 'sat', 'profile']) expect(sectionOf(key)).toBeNull()
  })

  it('ученик в группе: «Выбрать группу» открыта, «Мой учитель» закрыт', () => {
    expect(isSectionOpen(group, 'group')).toBe(true)
    expect(isSectionOpen(group, 'my-teacher')).toBe(false)
    expect(isSectionOpen(group, 'teacher-wizard')).toBe(false)
    expect(isSectionOpen(group, 'lessons')).toBe(true)
  })

  it('разделы без настройки открыты всегда', () => {
    expect(isSectionOpen(group, 'home')).toBe(true)
    expect(isSectionOpen(group, 'ielts')).toBe(true)
    expect(isSectionOpen(group, 'prizes')).toBe(true)
  })

  it('нет ответа сервера или абонемента (онбординг) — ничего не закрыто', () => {
    expect(isSectionOpen(null, 'my-teacher')).toBe(true)
    expect(isSectionOpen(undefined, 'group')).toBe(true)
    expect(isSectionOpen({ known: false, allowed: ['home'] }, 'my-teacher')).toBe(true)
    expect(isSectionOpen({ known: true }, 'my-teacher')).toBe(true)
  })
})
