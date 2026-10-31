import { describe, it, expect } from 'vitest'
import { isSectionOpen, sectionOf, studentSectionStatus } from './studentSections.js'

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

  it('общие разделы настройке не подлежат; IELTS/SAT и их вложенные экраны учитывают матрицу', () => {
    for (const key of ['home', 'prizes', 'feedback', 'tokens', 'profile']) expect(sectionOf(key)).toBeNull()
    for (const key of ['ielts', 'ielts-diagnostic', 'ielts-reading']) expect(sectionOf(key)).toBe('ielts')
    for (const key of ['sat', 'sat-mock', 'sat-weekly']) expect(sectionOf(key)).toBe('sat')
  })

  it('ученик в группе: «Выбрать группу» открыта, «Мой учитель» закрыт', () => {
    expect(isSectionOpen(group, 'group')).toBe(true)
    expect(isSectionOpen(group, 'my-teacher')).toBe(false)
    expect(isSectionOpen(group, 'teacher-wizard')).toBe(false)
    expect(isSectionOpen(group, 'lessons')).toBe(true)
  })

  it('разделы без настройки открыты всегда', () => {
    expect(isSectionOpen(group, 'home')).toBe(true)
    expect(isSectionOpen(group, 'ielts')).toBe(false)
    expect(isSectionOpen(group, 'prizes')).toBe(true)
  })

  it('только явный ответ про онбординг открывает меню; отсутствие ответа не даёт доступ', () => {
    expect(isSectionOpen(null, 'my-teacher')).toBe(false)
    expect(isSectionOpen(undefined, 'group')).toBe(false)
    expect(isSectionOpen({ known: false, allowed: ['home'] }, 'my-teacher')).toBe(true)
    expect(isSectionOpen({ known: true }, 'my-teacher')).toBe(false)
    expect(isSectionOpen({ status: 'error' }, 'lessons')).toBe(false)
    expect(isSectionOpen({ status: 'error' }, 'home')).toBe(true)
  })

  it('экзамены требуют и матрицу, и отдельный доступ, в том числе по прямой ссылке', () => {
    const exams = { ready: true, ielts: true, sat: true }
    const access = { known: true, allowed: ['ielts'] }
    expect(studentSectionStatus(access, 'ielts-reading', exams)).toBe('open')
    expect(studentSectionStatus(access, 'sat-mock', exams)).toBe('closed')
    expect(studentSectionStatus(access, 'ielts-reading', { ready: true, ielts: false })).toBe('closed')
    expect(studentSectionStatus(access, 'ielts', { ready: false })).toBe('loading')
    expect(studentSectionStatus({ status: 'error' }, 'ielts', exams)).toBe('error')
  })
})
